---
name: walkthrough
description: "Explain how a feature/flow works in this codebase as a code-flow DIAGRAM plus a high-level guided walkthrough — from the entry point down through the layers, with clickable file:line references and architecture-boundary annotations. Read-only (never edits code). Invoke /walkthrough <feature, flow, or entry point>, e.g. /walkthrough the acquire process or /walkthrough scripts/acquire.ts."
allowed-tools: "Bash(grep *) Bash(git grep *) Bash(rg *) Bash(sed *) Bash(ls *) Bash(find *) Read(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

# walkthrough — explain a flow, with a diagram

Produce the kind of explanation that orients someone fast: a small **ASCII
call-flow diagram** at the top, then a **numbered narrative** that walks the
chain hop by hop. Read-only — this skill explains code, it never changes it.

## When to use

`/walkthrough <target>` where target is a feature, a flow, or an entry point
("the acquire process", "scripts/acquire.ts", "how retrieval ranks results").
If no target is given, ask for one (or offer the obvious entry points you find).

## The output shape (always both)

1. **A diagram** — top is the entry point; arrows flow downward through each
   hop/layer. Annotate architectural seams inline (which box is a context vs. an
   adapter vs. pure data vs. the composition root). Keep it to ~one screen.
2. **A numbered narrative** — one step per hop. Each step leads with *what it
   does and why* (architecture altitude), names the module/boundary it lives in,
   and cites the exact code as a clickable `path:line` reference.

End by offering to zoom into any single step.

## Procedure

1. **Find the entry point.** Locate where the flow starts (a `scripts/*` runner,
   an exported function, an HTTP/MCP handler, a CLI command in package.json).
2. **Trace the chain.** Follow calls/imports outward, hop by hop, reading just
   enough of each file to know what it does and what it calls next. Note where a
   call crosses an architecture boundary (context → port, composition root →
   adapter, etc.).
3. **Pin accurate anchors.** Before citing line numbers, `grep -n` / `git grep -n`
   for the function/symbol so every `path:line` reference is correct and
   clickable. Wrong line numbers are worse than none.
4. **Render** the diagram, then the narrative. Lead each step with the what/why;
   keep file-level mechanics inside the step, not in the summary.

## Style

- Plain language first; the reader holds the architecture, you supply the map.
- Don't paste big code blocks — explain them and point to `path:line`.
- Use this repo's vocabulary when relevant (contexts, ports, adapters,
  composition root, the import law) — see `docs/architecture.md` §5.
- Be honest about gaps: if a hop is stubbed, deferred, or unverified, say so.
