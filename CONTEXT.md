# jesusfilm-rag

A read-only RAG over publicly accessible JesusFilm/Cru-family content: sources are
acquired, ingested, and served as ranked, cited retrieval results. This glossary is
the ubiquitous language; architecture and decisions live in `docs/`.

## Language

### Acquisition

**Fetch strategy**:
How a source's bytes are obtained during acquisition — plain HTTP, or a rendered
browser via Firecrawl. A deliberate, per-source choice declared in the source's
crawl policy when the source is first sliced; never selected or switched at runtime.
_Avoid_: acquire approach, form of acquisition, fetch mode

**Firecrawl**:
The paid managed scraping service that executes JS challenges and returns rendered
pages. In this system it is strictly a transport (an optional fetch strategy) —
discovery, extraction, and chunking remain in-repo for every source.
_Avoid_: FirePool

**Walled source**:
A source whose content pages sit behind a bot wall (e.g. a Cloudflare JS managed
challenge) that plain HTTP cannot pass. "Walled" describes the site's behaviour;
the tracker status `Blocked` describes our inability to proceed — a walled source
stops being Blocked once a fetch strategy that passes the wall is chosen.
_Avoid_: bot-blocked site (conflates with the `blocked` trust level)

**Ingestion mode**:
What kind of source this is for ingestion purposes (HTML scrape, API, RSS, manual).
Orthogonal to fetch strategy: a walled HTML site is still an HTML scrape — only the
transport differs.
