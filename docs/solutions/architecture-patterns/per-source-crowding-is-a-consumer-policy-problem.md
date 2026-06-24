---
title: "Per-source crowding is a consumer policy problem, not an engine bug"
date: "2026-06-10"
problem_type: "architecture_pattern"
component: "retrieval"
tags: ["mechanism-not-policy", "diversity", "maxPerSource", "mmr", "crowding"]
severity: "medium"
---

## Pattern

On shared topics, large sources (`thelife`, `sightline`) consistently crowd
smaller sources (`cru` ~0.17, `swg` ~0.34 per-source coverage) out of the top-10
— **even after curation**. Slice #5 produced the sharpest evidence so far.

## Why this is NOT an engine fault

The retrieval engine *finds* the credited small-source docs — they rank **11–20**,
just below the cutoff. Similarity ranking is working as specified. Pulling those
docs up by biasing the engine toward under-represented sources at retrieve time
would be **retrieve-time policy** — exactly what the `mechanism, not policy`
tenet forbids (AGENT.md §"Core tenet"). The engine must stay a deterministic,
parameterized mechanism.

## Where the fix belongs — the consumer layer

Diversity / de-crowding is a **consumer-layer concern**, expressed through the
declared `RetrievalPolicy`, not baked into ranking:

- `maxPerSource` / MMR-style diversification (tracked as **FOLLOW-UP I #15**),
- or an `excludedSourceKeys` filter the consumer sets per query.

The consumer knows "what's good for this audience"; the engine does not. Keeping
de-crowding in the consumer preserves determinism and cite-ability for every
other caller.

## Rule of thumb

If a *relevant* doc is findable but ranks just below the cutoff because another
source dominates, that is a **policy** signal for the consumer layer — reach for
`maxPerSource`/MMR/exclusions — **not** a reason to add source bias to the engine.

_Backfilled from memory (learning recorded 2026-06-10, FOLLOW-UP I #15; sharpest
evidence on slice #5)._
