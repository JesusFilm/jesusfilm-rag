import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OpenRouterLanguageDetector,
  parseDetection,
  isRetryableLangDetectError,
} from "./openrouter-language-detector.js";

/** Build a fake OpenAI-compatible chat response whose content is `content`. */
function chatResponse(content: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERR",
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  } as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parseDetection — strict on structure, lenient on the language value", () => {
  it("parses a clean JSON verdict", () => {
    expect(
      parseDetection('{"language":"fr","confidence":0.97,"evidence":"la vérité"}'),
    ).toEqual({ language: "fr", confidence: 0.97, evidence: "la vérité" });
  });

  it("tolerates a ```json fenced block and surrounding prose", () => {
    const r = parseDetection('Sure!\n```json\n{"language":"es","confidence":0.8,"evidence":"hola"}\n```');
    expect(r).toMatchObject({ language: "es", confidence: 0.8 });
  });

  it("normalises a non-ISO / 639-3 / unknown language to an honest abstain", () => {
    // "eng" (639-3) and "english" are rejected — only 2-letter 639-1 is accepted.
    for (const lang of ["unknown", "und", "english", "eng", "zz9"]) {
      const r = parseDetection(`{"language":"${lang}","confidence":0.9,"evidence":"x"}`);
      expect(r.language).toBeNull();
      expect(r.confidence).toBe(0); // abstain ⇒ zeroed confidence
    }
  });

  it("rejects a committed language with a malformed / out-of-range confidence", () => {
    // A verdict that names a language must carry a well-formed confidence in [0,1];
    // anything else is a malformed response (rejected, not silently clamped).
    for (const conf of ["5", "-2", '"high"', "null"]) {
      expect(() =>
        parseDetection(`{"language":"en","confidence":${conf},"evidence":"x"}`),
      ).toThrow(/malformed\s+confidence/);
    }
    // A valid boundary confidence is accepted.
    expect(parseDetection('{"language":"en","confidence":1,"evidence":"x"}').confidence).toBe(1);
  });

  it("throws on a non-JSON body (a hard, non-retryable failure)", () => {
    expect(() => parseDetection("I think it's French.")).toThrow();
  });

  it("throws when the 'language' field is missing", () => {
    expect(() => parseDetection('{"confidence":0.9}')).toThrow(/missing 'language'/);
  });
});

describe("OpenRouterLanguageDetector.detect", () => {
  const make = () =>
    new OpenRouterLanguageDetector({
      apiKey: "test-key",
      retryBaseDelayMs: 1, // keep retry tests fast
    });

  it("returns the parsed verdict from the chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chatResponse('{"language":"fr","confidence":0.95,"evidence":"vérité"}'),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await make().detect("Quelque chose ne va pas.", { declared: ["en", "fr"] });
    expect(r).toMatchObject({ language: "fr", confidence: 0.95 });
    // POSTs to the chat-completions endpoint with a bearer token.
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/chat\/completions$/);
    expect((init as RequestInit).method).toBe("POST");
  });

  it("abstains on blank input WITHOUT calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await make().detect("   \n  ", { declared: ["en"] });
    expect(r).toEqual({ language: null, confidence: 0, evidence: "" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries a transient 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(chatResponse("rate limited", 429))
      .mockResolvedValueOnce(
        chatResponse('{"language":"en","confidence":0.9,"evidence":"Hello world"}'),
      );
    vi.stubGlobal("fetch", fetchMock);

    const r = await make().detect("Hello world, this is English.", { declared: ["en"] });
    expect(r.language).toBe("en");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 400 (client error)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatResponse("bad request", 400));
    vi.stubGlobal("fetch", fetchMock);
    await expect(make().detect("x".repeat(20), { declared: ["en"] })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("detect — system prompt scores the body, not the chrome (#94 guard)", () => {
  /** Capture the system message actually sent to the chat endpoint. */
  async function capturedSystemPrompt(): Promise<string> {
    const fetchMock = vi.fn().mockResolvedValue(
      chatResponse('{"language":"en","confidence":0.9,"evidence":"x"}'),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new OpenRouterLanguageDetector({ apiKey: "test-key" }).detect(
      "Some English body text long enough to send.",
      { declared: ["en", "es"] },
    );
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as {
      messages: { role: string; content: string }[];
    };
    return body.messages.find((m) => m.role === "system")!.content;
  }

  it("directs the model at the MAIN BODY and to IGNORE site chrome", async () => {
    const p = await capturedSystemPrompt();
    // The core guardrail: judge the body, ignore chrome.
    expect(p).toMatch(/main (content|body)/i);
    expect(p).toMatch(/ignore.*chrome/i);
    // Names the specific boilerplate that fooled the cru sweep (footer/breadcrumb).
    expect(p).toMatch(/footer/i);
    expect(p).toMatch(/breadcrumb/i);
    // Body wins when chrome disagrees, and the evidence quote comes FROM the body.
    expect(p).toMatch(/\bbody\b[^.]*\bwins\b/i);
    expect(p).toMatch(/evidence[^.]*from the main body/i);
  });

  it("no longer rests the verdict on the 'single DOMINANT' framing that fooled it", async () => {
    const p = await capturedSystemPrompt();
    // Regression guard: the pre-#94 wording asked for the single dominant language
    // of the whole document, which let a Spanish footer/breadcrumb relabel an
    // English article. That framing must not come back.
    expect(p).not.toMatch(/single DOMINANT natural/i);
  });
});

describe("isRetryableLangDetectError", () => {
  it("treats timeouts and network drops as retryable, parse errors as not", () => {
    expect(isRetryableLangDetectError({ name: "AbortError" })).toBe(true);
    expect(isRetryableLangDetectError({ name: "TypeError" })).toBe(true);
    expect(isRetryableLangDetectError({ retryable: false, name: "TypeError" })).toBe(false);
    expect(isRetryableLangDetectError(new Error("not JSON"))).toBe(false);
  });
});
