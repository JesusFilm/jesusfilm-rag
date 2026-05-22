/**
 * Composition root — the ONLY module that constructs concrete adapters
 * (src/adapters/*) and wires them into the contexts. Everything else depends on
 * interfaces in src/contracts and receives its dependencies by injection. This
 * boundary is enforced by .dependency-cruiser.cjs (see docs/architecture.md §5).
 *
 * `wire()` is the single place adapters are built; the CLI runners
 * (scripts/acquire.ts, scripts/index.ts) and the serving entrypoint call it
 * rather than constructing adapters themselves (architecture §10). As later
 * build steps land, wire() grows the Embedder/Fetcher adapters and assembles
 * the Acquisition/Ingestion/Retrieval contexts around these ports.
 */
import type {
  CorpusSearchStore,
  CorpusWriteStore,
  FetchStateStore,
  RawDocumentStore,
} from "@/contracts/index.js";
import {
  PostgresCorpusSearchStore,
  PostgresCorpusWriteStore,
  PostgresFetchStateStore,
  PostgresRawDocumentStore,
} from "@/adapters/postgres/index.js";
import { closeDb, getDb } from "@/db/index.js";

/** The injected ports a runner needs, plus a shutdown hook for the DB pool. */
export interface Wiring {
  corpusWriteStore: CorpusWriteStore;
  corpusSearchStore: CorpusSearchStore;
  fetchStateStore: FetchStateStore;
  rawDocumentStore: RawDocumentStore;
  shutdown(): Promise<void>;
}

/** Build the storage adapters over the shared Postgres pool. */
export function wire(): Wiring {
  const { client } = getDb();
  return {
    corpusWriteStore: new PostgresCorpusWriteStore(client),
    corpusSearchStore: new PostgresCorpusSearchStore(client),
    fetchStateStore: new PostgresFetchStateStore(client),
    rawDocumentStore: new PostgresRawDocumentStore(client),
    shutdown: () => closeDb(),
  };
}
