/**
 * OpenRouter Language Detector adapter — the concrete `LanguageDetector` port
 * over an OpenAI-compatible chat-completions endpoint (POST `{baseUrl}/chat/
 * completions`). This is the LLM escalation ADR-0006/0007 reserved behind a port:
 * the corrective language sweep uses it to re-derive `documents.language`
 * accurately REGARDLESS OF LENGTH, where the pure tinyld primitive is confidently
 * wrong on short prose (a 251-char English listing reads `hi`@1.000). Constructed
 * only by main.ts (or a script's own wiring). See architecture §4.
 *
 * Provider-agnostic despite the name: `baseUrl` points at OpenRouter by default,
 * or at any OpenAI-compatible `/chat/completions` (e.g. a self-hosted Ollama
 * `/v1`). Uses a cheap capable model (default Gemini Flash Lite) and asks for a
 * strict JSON verdict `{ language, confidence, evidence }`.
 *
 * Retry discipline is copied verbatim from the OpenRouter Embedder (issue #64):
 * request timeout (AbortError), network drop (TypeError) and HTTP 429/5xx are
 * retried per call with exponential backoff up to `maxAttempts` (default 10,
 * backoff capped at 8s); other 4xx and a malformed/unparseable response are HARD
 * failures — a retry can't fix them. A per-document detect() failure is caught by
 * the sweep and recorded as an anomaly, so one bad row never aborts the run.
 */
import type {
  DetectedLanguage,
  LanguageDetector,
  LlmReviewer,
} from "@/contracts/index.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 10; // 1 initial try + 9 retries (~47s total).
const DEFAULT_RETRY_BASE_DELAY_MS = 500; // 500ms → 1s → 2s → 4s → 8s → 8s … (doubles, capped).
const RETRY_MAX_DELAY_MS = 8_000; // ceiling so a high maxAttempts can't wait minutes.
const DEFAULT_MAX_OUTPUT_TOKENS = 200; // a code + confidence + short quote is tiny.

/** A valid ISO 639-1 code (two lowercase letters) — the `documents.language`
 *  contract. A three-letter 639-3 code (`eng`) is deliberately NOT accepted. */
const ISO_CODE = /^[a-z]{2}$/;

// Scores the MAIN BODY, not the page chrome. Scraped pages are frequently
// bilingual — an English article framed by a Spanish nav/breadcrumb/footer (and
// vice-versa) — and the sweep feeds the model the front slice of cleaned text,
// which leads with that chrome. The earlier "single DOMINANT language" wording
// let the model rest its verdict on a salient boilerplate quote (a Spanish
// footer "©2025 Cru… derechos reservados", a "Comparte el evangelio" breadcrumb)
// and relabel an English article `es`. This prompt names chrome explicitly and
// requires the verdict — and its evidence quote — to come from the body. (#94)
const SYSTEM_PROMPT =
  "You are a precise language identifier. Identify the language of the document's " +
  "MAIN CONTENT — the primary article body, the substantive prose the page is " +
  "actually about. A web page is often bilingual: the main content is in one " +
  "language while the surrounding site CHROME is in another. You must IGNORE the " +
  "chrome and judge only the body. Chrome means: navigation and menus, " +
  "breadcrumbs, page header, footer, copyright and legal notices (e.g. " +
  "\"© 2025 …, all rights reserved\"), cookie/consent banners, share and social " +
  "buttons, related-links and \"read next\" lists, and any short repeated " +
  "template/boilerplate text. If the chrome is in a different language from the " +
  "body, the BODY wins — never label a page by its footer, breadcrumb, or menu. " +
  "Reply with ONLY a JSON object of the exact shape {\"language\": string|null, " +
  '"confidence": number, "evidence": string}. "language" is a lowercase ISO ' +
  '639-1 code (e.g. "en", "es", "fr", "zh") for the MAIN BODY, or null ONLY if ' +
  "there is no real body to judge (empty, pure markup/numbers, or the body " +
  "itself is a genuine even mix with no dominant language — a foreign footer " +
  'does NOT make a page a mix). "confidence" is a number from 0 to 1. ' +
  '"evidence" is a SHORT verbatim quote (<=120 chars) taken FROM THE MAIN BODY ' +
  "(never from chrome) that the verdict rests on. The source may DECLARE an " +
  "expected language set, given only as a hint — the actual body content always " +
  "wins. Never explain; return only the JSON object.";

export interface OpenRouterLanguageDetectorOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Max attempts per call (initial try + retries). Floored at 1; default 10. */
  maxAttempts?: number;
  /** Backoff before the first retry; doubles each retry, capped at 8s. */
  retryBaseDelayMs?: number;
  /** Cap on the model's output tokens (the verdict is tiny). */
  maxOutputTokens?: number;
  /** Observe a transient failure about to be retried (logging / metrics). */
  onRetry?: (info: LangDetectRetryInfo) => void;
}

export interface LangDetectRetryInfo {
  /** The attempt that just failed (1-based). */
  attempt: number;
  /** Configured maximum number of attempts. */
  maxAttempts: number;
  /** Backoff applied before the next attempt, in ms. */
  delayMs: number;
  /** The transient error being retried. */
  error: unknown;
}

/** OpenAI-compatible chat-completions response (the subset we read). */
interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

/** A non-2xx from the chat endpoint, tagged with whether a retry may help. */
class LangDetectHttpError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(status: number, statusText: string, detail: string) {
    super(
      `OpenRouter language detection failed: ${status} ${statusText}` +
        (detail ? ` — ${detail.slice(0, 300)}` : ""),
    );
    this.name = "LangDetectHttpError";
    this.status = status;
    // 429 (rate limit) + 5xx (server) are transient; other 4xx are caller bugs.
    this.retryable = status === 429 || status >= 500;
  }
}

/**
 * Classify a detect failure as worth retrying. HTTP errors carry an explicit
 * `retryable` flag (429/5xx yes, other 4xx no). A timeout surfaces as an
 * AbortError and a network drop as a TypeError (undici "fetch failed") — both
 * transient. Anything else (a malformed/unparseable model response) is a hard
 * failure a retry cannot fix.
 */
export function isRetryableLangDetectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { retryable?: boolean; name?: string };
  if (typeof e.retryable === "boolean") return e.retryable;
  return e.name === "AbortError" || e.name === "TypeError";
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract a JSON object from the model's reply. Tolerates a ```json fenced block
 * or leading/trailing prose by slicing the outermost `{ … }`; returns the raw
 * string when no braces are present (so JSON.parse throws a clear error).
 */
function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : content;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return body.trim();
  return body.slice(start, end + 1);
}

/**
 * Parse and normalise the model's verdict into a `DetectedLanguage`. Strict on
 * STRUCTURE (unparseable / missing fields → throw, a hard non-retryable failure),
 * lenient on the language VALUE (a non-ISO or "unknown"/"und" code normalises to
 * an honest abstain rather than crashing the run).
 */
export function parseDetection(content: string): DetectedLanguage {
  let obj: unknown;
  try {
    obj = JSON.parse(extractJsonObject(content));
  } catch {
    throw new Error(
      `OpenRouter language detection: response was not JSON — ${content.slice(0, 200)}`,
    );
  }
  if (!obj || typeof obj !== "object") {
    throw new Error("OpenRouter language detection: response was not a JSON object");
  }
  const rec = obj as Record<string, unknown>;
  if (!("language" in rec)) {
    throw new Error("OpenRouter language detection: response missing 'language' field");
  }

  const rawLang = rec.language;
  let language: string | null = null;
  if (typeof rawLang === "string") {
    const code = rawLang.trim().toLowerCase();
    // Content-value leniency: an unknown/undetermined marker or a non-ISO string
    // is an honest abstain, not a hard error.
    if (code && code !== "und" && code !== "unknown" && ISO_CODE.test(code)) {
      language = code;
    }
  }

  // Confidence is a trust signal for a WRITE, so it must be well-formed when the
  // model commits to a language: a response that can't format a number in [0,1]
  // is malformed and is rejected (a hard, non-retryable failure → the sweep logs
  // the doc as an anomaly and leaves it untouched, never applying a bogus verdict).
  // An abstain (`language === null`) carries confidence 0 by definition.
  const rawConf = rec.confidence;
  if (language !== null) {
    if (
      typeof rawConf !== "number" ||
      !Number.isFinite(rawConf) ||
      rawConf < 0 ||
      rawConf > 1
    ) {
      throw new Error(
        `OpenRouter language detection: language '${language}' with malformed ` +
          `confidence ${JSON.stringify(rawConf)} (expected a number in [0, 1])`,
      );
    }
  }
  const confidence = language === null ? 0 : (rawConf as number);

  // Evidence is display-only (report + review), never part of the write decision,
  // so a missing quote is tolerated rather than failing an otherwise-valid verdict.
  const evidence = typeof rec.evidence === "string" ? rec.evidence.slice(0, 240) : "";

  return { language, confidence, evidence };
}

export class OpenRouterLanguageDetector implements LanguageDetector {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly maxOutputTokens: number;
  private readonly onRetry?: (info: LangDetectRetryInfo) => void;

  constructor(opts: OpenRouterLanguageDetectorOptions) {
    if (!opts.apiKey) throw new Error("OpenRouterLanguageDetector: apiKey is required");
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // A misconfigured 0/negative would skip every attempt — floor at 1.
    this.maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.retryBaseDelayMs = opts.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.onRetry = opts.onRetry;
  }

  /**
   * Detect the dominant language of `text`. Blank input never hits the API and
   * abstains. `declared` is passed to the model as a hint only; content wins.
   */
  async detect(
    text: string,
    opts: { declared: readonly string[] },
  ): Promise<DetectedLanguage> {
    const trimmed = text.trim();
    if (!trimmed) return { language: null, confidence: 0, evidence: "" };
    const declaredHint =
      opts.declared.length > 0
        ? `The source declares these expected languages (hint only): [${opts.declared.join(", ")}].\n\n`
        : "";
    return this.post(`${declaredHint}Document:\n${trimmed}`);
  }

  /** POST one detection, retrying transient failures with exponential backoff. */
  private async post(userContent: string): Promise<DetectedLanguage> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.postOnce(userContent);
      } catch (err) {
        if (attempt >= this.maxAttempts || !isRetryableLangDetectError(err)) throw err;
        const delayMs = Math.min(
          this.retryBaseDelayMs * 2 ** (attempt - 1),
          RETRY_MAX_DELAY_MS,
        );
        this.onRetry?.({ attempt, maxAttempts: this.maxAttempts, delayMs, error: err });
        await sleep(delayMs);
      }
    }
  }

  /** One POST attempt: a parsed, normalised verdict. */
  private async postOnce(userContent: string): Promise<DetectedLanguage> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: this.maxOutputTokens,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new LangDetectHttpError(res.status, res.statusText, detail);
      }
      const json = (await res.json()) as ChatCompletionResponse;
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new Error("OpenRouter language detection: empty completion content");
      }
      return parseDetection(content);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ── reviewer ───────────────────────────────────────────────────────────────

const DEFAULT_REVIEW_MAX_OUTPUT_TOKENS = 1200; // a bulleted verdict, not JSON.

export interface OpenRouterReviewerOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  maxOutputTokens?: number;
  onRetry?: (info: LangDetectRetryInfo) => void;
}

/**
 * OpenRouter Reviewer adapter — a free-form chat pass over the language sweep's
 * change summary (`--llm-review`), reusing the same endpoint and transient-retry
 * discipline as the detector above. Returns the model's raw text verdict; the
 * caller writes it beside the run's other logs.
 */
export class OpenRouterReviewer implements LlmReviewer {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly maxOutputTokens: number;
  private readonly onRetry?: (info: LangDetectRetryInfo) => void;

  constructor(opts: OpenRouterReviewerOptions) {
    if (!opts.apiKey) throw new Error("OpenRouterReviewer: apiKey is required");
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.retryBaseDelayMs = opts.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_REVIEW_MAX_OUTPUT_TOKENS;
    this.onRetry = opts.onRetry;
  }

  async review(instruction: string, content: string): Promise<string> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.reviewOnce(instruction, content);
      } catch (err) {
        if (attempt >= this.maxAttempts || !isRetryableLangDetectError(err)) throw err;
        const delayMs = Math.min(
          this.retryBaseDelayMs * 2 ** (attempt - 1),
          RETRY_MAX_DELAY_MS,
        );
        this.onRetry?.({ attempt, maxAttempts: this.maxAttempts, delayMs, error: err });
        await sleep(delayMs);
      }
    }
  }

  private async reviewOnce(instruction: string, content: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: instruction },
            { role: "user", content },
          ],
          temperature: 0,
          max_tokens: this.maxOutputTokens,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new LangDetectHttpError(res.status, res.statusText, detail);
      }
      const json = (await res.json()) as ChatCompletionResponse;
      const out = json.choices?.[0]?.message?.content;
      if (typeof out !== "string" || out.trim() === "") {
        throw new Error("OpenRouter review: empty completion content");
      }
      return out.trim();
    } finally {
      clearTimeout(timer);
    }
  }
}
