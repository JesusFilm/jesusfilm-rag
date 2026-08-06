export const DEFAULT_INGEST_CONCURRENCY = 4;
export const MAX_INGEST_CONCURRENCY = 4;

/** Parse the shared local/production ingestion concurrency flag without I/O. */
export function parseIngestConcurrency(argv: string[]): {
  concurrency: number;
  error?: string;
} {
  const index = argv.indexOf("--concurrency");
  const raw = index >= 0 ? argv[index + 1] : String(DEFAULT_INGEST_CONCURRENCY);
  const concurrency = Number(raw);
  if (
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > MAX_INGEST_CONCURRENCY
  ) {
    return {
      concurrency,
      error:
        `--concurrency must be a safe integer from 1 to ${MAX_INGEST_CONCURRENCY}, ` +
        `got "${raw ?? ""}"`,
    };
  }
  return { concurrency };
}
