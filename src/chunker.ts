/**
 * Paragraph-first chunker.
 *
 * Strategy:
 * 1. Split on blank-line boundaries (paragraphs).
 * 2. Group consecutive paragraphs until adding the next would exceed the target.
 * 3. If a single paragraph is longer than the target, split on sentence-ish
 *    boundaries (`. `, `? `, `! `, newline).
 * 4. Overlap consecutive chunks by `overlapTokens` tokens to preserve context.
 *
 * Token estimation: 1 token ≈ 4 chars, so the byte budget is `tokens * 4`.
 * Good enough for retrieval (not for billing). tiktoken would tighten this but
 * adds a 4MB native dep — not worth it.
 *
 * Params match jesusfilm-ai (the port source of record): target ~500 tokens,
 * 50-token overlap, drop tail chunks shorter than `minChunkTokens`. Kept a pure
 * function — no I/O, deterministic for a given input + options.
 */

const DEFAULT_TARGET_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 50;
const DEFAULT_MIN_CHUNK_TOKENS = 20;
const APPROX_CHARS_PER_TOKEN = 4;

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
  /** Drop a trailing chunk shorter than this many tokens. Default 20. */
  minChunkTokens?: number;
}

export interface Chunk {
  ord: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenCount: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const target = options.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlap = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const minChunkTokens = options.minChunkTokens ?? DEFAULT_MIN_CHUNK_TOKENS;
  const targetChars = target * APPROX_CHARS_PER_TOKEN;
  const overlapChars = overlap * APPROX_CHARS_PER_TOKEN;

  // Locate paragraph spans, tracking char offsets.
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return [];

  // Pre-split paragraphs that are too long.
  const segments: { text: string; start: number; end: number }[] = [];
  for (const p of paragraphs) {
    if (p.text.length <= targetChars) {
      segments.push(p);
    } else {
      segments.push(...splitLongParagraph(p, targetChars));
    }
  }

  // Greedily pack segments into chunks.
  const chunks: Chunk[] = [];
  let buf: { text: string; start: number; end: number } | null = null;

  for (const seg of segments) {
    if (!buf) {
      buf = { ...seg };
      continue;
    }
    const joinedLen = buf.text.length + 2 + seg.text.length; // \n\n joiner
    if (joinedLen > targetChars) {
      chunks.push(toChunk(chunks.length, buf));
      // Start next chunk with overlap from the end of the just-flushed chunk.
      buf = withOverlap(seg, buf, overlapChars);
    } else {
      buf = {
        text: `${buf.text}\n\n${seg.text}`,
        start: buf.start,
        end: seg.end,
      };
    }
  }
  if (buf) chunks.push(toChunk(chunks.length, buf));

  // Drop a too-short trailing chunk (a dangling remainder below the floor).
  // Only the tail is pruned — interior chunks are kept even if short, and a
  // sole chunk is always kept so non-empty input never yields zero chunks.
  while (
    chunks.length > 1 &&
    chunks[chunks.length - 1].tokenCount < minChunkTokens
  ) {
    chunks.pop();
  }

  return chunks;
}

function splitParagraphs(
  text: string,
): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  // Match runs of non-blank lines.
  const re = /(?:^|\n)([^\n][\s\S]*?)(?=\n\s*\n|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const para = m[1].trim();
    if (!para) continue;
    const start = m.index + (m[0].startsWith("\n") ? 1 : 0);
    out.push({ text: para, start, end: start + para.length });
  }
  return out;
}

function splitLongParagraph(
  p: { text: string; start: number; end: number },
  targetChars: number,
): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  // Split on sentence boundaries.
  const re = /([^.!?\n]+[.!?]+|[^.!?\n]+$)/g;
  let m: RegExpExecArray | null;
  let cur = "";
  let curStart = p.start;
  let cursor = 0;
  while ((m = re.exec(p.text)) !== null) {
    const sentence = m[0];
    const sentStart = p.start + m.index;
    if (cur.length + sentence.length > targetChars && cur) {
      out.push({ text: cur.trim(), start: curStart, end: curStart + cur.length });
      cur = sentence;
      curStart = sentStart;
    } else {
      if (!cur) curStart = sentStart;
      cur += sentence;
    }
    cursor = m.index + sentence.length;
  }
  if (cur) {
    out.push({ text: cur.trim(), start: curStart, end: curStart + cur.length });
  }
  if (out.length === 0) {
    // No sentence boundary found — fall back to char-window split.
    for (let i = 0; i < p.text.length; i += targetChars) {
      const slice = p.text.slice(i, i + targetChars);
      out.push({ text: slice, start: p.start + i, end: p.start + i + slice.length });
    }
  }
  void cursor;
  return out;
}

function withOverlap(
  seg: { text: string; start: number; end: number },
  prev: { text: string; start: number; end: number },
  overlapChars: number,
): { text: string; start: number; end: number } {
  if (overlapChars <= 0) return { ...seg };
  const tailLen = Math.min(overlapChars, prev.text.length);
  const tail = prev.text.slice(prev.text.length - tailLen);
  return {
    text: `${tail}\n\n${seg.text}`,
    start: prev.end - tailLen,
    end: seg.end,
  };
}

function toChunk(
  ord: number,
  buf: { text: string; start: number; end: number },
): Chunk {
  return {
    ord,
    text: buf.text,
    charStart: buf.start,
    charEnd: buf.end,
    tokenCount: Math.ceil(buf.text.length / APPROX_CHARS_PER_TOKEN),
  };
}
