# fakes — boundary

Owns: in-memory test doubles for every contract port (`FakeEmbedder`, `FakeFetcher`, `FakeFetchStateStore`, `FakeCorpusWriteStore`, `FakeCorpusSearchStore`) — the substrate for fakes-only unit tests (docs/architecture.md §5.6).
May import: `contracts`, this dir. MUST NOT import: any context, `registry`, `adapters`, `serving`, `main`.
Imported only by `*.test.ts` files — never by production code (a runtime path wiring a fake is a bug). Both rules are enforced by `.dependency-cruiser.cjs`.
Keep fakes faithful: a fake must honour the same load-bearing invariants as its real adapter (e.g. upsertSource-before-replaceDocument, delete-then-insert, null-per-empty embedding), or context tests pass against behaviour production won't reproduce.
