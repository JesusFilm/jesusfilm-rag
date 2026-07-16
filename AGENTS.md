# jesusfilm-rag — agents

A standalone, production-quality RAG over publicly accessible JesusFilm Project content. Read-only retrieval exposed to other tools (Claude Code, agents, internal services) via an MCP server. **Consumers generate; this service only retrieves.**

**Core tenet — mechanism, not policy:** the RAG is a reliable, parameterized retrieval mechanism; all "what's good for this audience" weighting lives in the consumer; corpus heterogeneity is solved by ingest-time labeling (`category`/`tags`/`sourceKey`) and source-level on/off, **not** retrieve-time bias. The engine ranks on similarity + the declared `RetrievalPolicy` and returns deterministic, cited results. See [`docs/architecture.md`](./docs/architecture.md) §1 "Tenet: mechanism, not policy".

**Design source of truth:** [`docs/architecture.md`](./docs/architecture.md). Read it before non-trivial work — especially §5 (Enforcement & dependency rules).

> **A note on the name.** This file — `AGENTS.md`, **plural** — is the whole-repo agent primer (the recognized cross-tool convention, auto-discovered by agent tooling). The **singular** per-context `AGENT.md` files under `src/*/` are a *different* thing: ~5-line boundary fences for one context each, defined by the Forge pattern in [`docs/architecture.md`](./docs/architecture.md) §5.7. **Plural = whole repo; singular = one context.**

## Three bounded contexts (behind ports)

| Context | Owns | Does NOT |
|---------|------|----------|
| **Acquisition** | scrapers, source registry, robots, HTTP cache, content extraction → emits `RawDocument` to `raw_documents` | normalize, chunk, embed, write corpus tables |
| **Ingestion** | normalize → chunk → embed → dedup → write (through the storage port) | fetch, run robots, expose search |
| **Retrieval** | query + policy → ranked, cited results (candidate selection, cosine rank, cutoff, dedup, citations) | generate prose, know about HTTP/MCP, apply safety/intent routing |

MCP/HTTP is a thin **serving adapter** over Retrieval, not a fourth context.

## The import law (enforced by `dependency-cruiser`)

Everything depends on *interfaces* (`src/contracts`), never on concrete code, except the composition root.

| Module | May import |
|--------|------------|
| `contracts/` | nothing |
| `registry/` | `contracts` |
| `acquisition/` `ingestion/` `retrieval/` `serving/` | `contracts`, `registry`, itself |
| `adapters/` | `contracts`, `src/db/schema` (+ external libs) |
| `main.ts` | anything (it wires) |

No context imports another context. No context or serving imports a concrete adapter. The only place adapters are constructed is `main.ts`, which injects them. A violation fails the build (`pnpm depcruise`).

Adapters may import **`src/db/schema.ts`** — the one relaxation of the law (ADR-0003): the Postgres adapter drives Drizzle's query builder off the schema for CRUD. The pgvector `<=>` and FTS `tsvector` hot paths stay raw `sql\`…\`` fragments interleaved in the builder (no ORM types them).

## Conventions

- **Postgres + `pgvector` only.** No alternative vector DBs. Schema in `src/db/schema.ts` (Drizzle); changes go through a migration — schema-ahead-of-migrations drift fails CI (`pnpm db:check`, the migration analogue of the contract-drift test).
- **Dependency injection, one composition root.** No module-level singletons, no top-level `new Adapter()`. Contexts receive ports as arguments.
- **Fakes-only unit tests.** Each port has an in-memory fake; context tests run with no Postgres and no network. A test that needs a real adapter is a coupling bug.
- **File-size cap** (eslint `max-lines` ≈ 300). When a file mixes responsibilities, split it.
- **Sources are defined in the code registry** (`src/registry`), not local files — each entry carries domain, crawl policy, default tags, trust, and languages.
- **Access is by `audience:` tag + per-consumer token scope**, not directory location. Default `audience:public`; anything more restricted must be tagged.
- **Read-only at the MCP boundary.** Any write surface is a separate internal tool, never exposed via MCP. Only Ingestion writes corpus rows.
- **Re-indexing is idempotent and source-scoped:** stale chunks for a changed source are deleted and replaced in the same transaction.
- **Embedding model recorded per row** (`chunk_embeddings.embedding_model`). Don't silently change it — add a new model row, then migrate.
- **Confirm before destructive ops** (dropping tables, deleting sources, force-pushing).
- **ADR checkpoint — surface architectural decisions, don't wait to be asked.** When a choice is *significant and hard to reverse* — establishing or changing a cross-cutting invariant, contradicting/amending an existing ADR or a convention in this list, a schema / write-path / port / data-semantics change, or any fork where you rejected a real alternative — **pause before moving on** and raise an ADR checkpoint:
  > 🏛️ **ADR checkpoint**
  > - Proposed: `ADR-NNNN` "\<title>"
  > - Decision: \<what we'd record>
  > - Trade-off: \<chosen> over \<rejected> — \<one line why>
  > - Relation: standalone | amends/supersedes `ADR-XXXX`
  > - → draft now / note & defer / skip (not ADR-worthy)?

  On **"draft now"**, run `/adr`. The bar + template live in [`docs/decisions/README.md`](./docs/decisions/README.md) → *When to raise an ADR checkpoint*. Err toward raising it — a 15-second checkpoint is cheaper than an un-recorded invariant a future contributor "simplifies" away. Do **NOT** raise it for routine implementation, bug fixes, or behavior-preserving refactors.
- **Commits follow Conventional Commits** (`feat: …`, `fix(retrieve): …`, `docs: …`; scope optional), enforced by a commitlint `commit-msg` hook (husky) — see `commitlint.config.mjs`. Squash-merge note: the commit that lands on `main` takes its subject from the **PR title**, which the hook can't see — so the PR title is linted separately by a CI check (`.github/workflows/pr-title.yml`).
- **Golden eval cases are authored with `/golden <source-key>`, not by hand.** After a source is ingested, the skill surveys the *real* corpus and drafts persona-diverse candidate questions — **seeker · skeptic · believer · newcomer**, each tied to a real document — plus off-topic negatives for cutoff calibration, for you to curate into `eval/qa-golden.yaml`. `pnpm eval` then scores recall@k / MRR. Retrieval-only — no intent/tone/answer judgment (that's a consumer concern). See [`.claude/skills/golden/SKILL.md`](./.claude/skills/golden/SKILL.md). **Non-English eval cases MUST carry an English translation of the question as a YAML comment (`# EN: …`) AND their retrieved results translated to English (a `# RETRIEVED` comment block, path + translated title per doc) — a non-English case without both is incomplete** (see docs/eval-approach.md → "Multilingual eval").
- Defer to `~/Jaxs/CLAUDE.md` for workspace-wide conventions (gh account, tone, decision hierarchy).

---

# Agent workflows

Agent-facing index of the repeatable workflows in this repo. Each is a `/skill`
(under `.claude/skills/`) backed by deterministic `pnpm` scripts, so an agent
orchestrates and verifies rather than free-hands the work.

| Skill | Does | Key scripts |
|-------|------|-------------|
| `/slice` | Drives one source through acquire → ingest → retrieve → spot-check, resumably | `pnpm acquire`/`index`/`query`, `status:*` |
| `/walkthrough` | Read-only code-flow explainer with diagrams | — |
| `/adr` | Records an architecture decision from the current change (template, index, citation, commit) | — |
| `/status-dashboard` | Refreshes the public status dashboard from prod and opens a PR | `pnpm dashboard:data`/`build`/`verify` |

## Status dashboard refresh (`/status-dashboard`)

Regenerates the public GitHub Pages dashboard — the source of truth for which
sources × languages exist in the RAG index and where each sits on the
**acquire → ingest → evaluate** journey — then opens a PR for an engineer to
merge. A secondary **"Unclassified documents"** table tallies any embedded docs
with no detected language per source, so the index total is never silently
under-reported (#86). Full runbook: `docs/ops/dashboard.md`. Skill: `.claude/skills/status-dashboard/SKILL.md`.

End-to-end flow the skill performs:

1. Open a GitHub issue tracking the refresh.
2. `doppler run -- pnpm dashboard:data` — read prod with locally-injected
   credentials → `dashboard/prod-status-data.json`.
3. `pnpm dashboard:build` — merge prod data + `docs/source-status.yaml` + registry
   → `dashboard/compiled-data.json` + `dashboard/index.html`.
4. Browser-verify the page actually displays the data; `pnpm dashboard:verify` as
   the headless gate.
5. Open a PR — **never merge** (the engineer merges; `pages.yml` deploys on merge).

### 🔒 Non-negotiable: credentials never leave the machine

Production credentials are fetched **only** via `doppler run -- <command>`, which
injects them into the subprocess environment. They must never pass through the
model/transcript, a file, the GitHub issue/PR, a commit, or a log. Never run a
command that prints a secret value (`doppler secrets get`, `printenv`,
`echo $DATABASE_URL`, `cat .env`). The data script prints only a **redacted** DB
URL. The full secret-safety contract is in the skill — read it before running.

## Workflow conventions

- TypeScript scripts under `scripts/` run via `tsx` + a `pnpm` entry.
- Pure, testable logic lives outside the depcruise'd `src/` context boundaries
  (e.g. `scripts/lib/`); tests live in `tests/` (integration) or beside `src/`
  (fakes-only unit). `pnpm test` runs vitest; `pnpm typecheck` / `pnpm lint` /
  `pnpm depcruise` gate structure.
- `docs/source-status.yaml` is the asserted per-language tracker — mutate it only
  through `pnpm status:*` (the deterministic writer), never by hand.
