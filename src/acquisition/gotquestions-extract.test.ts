import { describe, expect, it } from "vitest";
import { getSource } from "@/registry/index.js";
import { extractContent } from "./extract.js";

const PAGE = `<!doctype html><html lang="en"><head>
  <title>What is Christian Platonism? | GotQuestions.org</title></head><body>
  <nav>Home Content Index Donate</nav>
  <main><div class="breadcrumb-wrapper">Home / Worldview</div>
    <section class="content-wrap"><div class="content">
      <h1>What is Christian Platonism?</h1>
      <div itemprop="articleBody"><div class="label">Answer</div>
        <p>Christian Platonism uses Plato’s philosophy to explain Christian theology.</p>
        <p>Scripture remains authoritative over every philosophical framework.</p>
      </div>
      <div class="related topics">Related Articles: unrelated navigation text</div>
    </div></section>
  </main>
  <footer>Copyright and subscription furniture</footer>
  </body></html>`;

describe("GotQuestions extraction policy", () => {
  it("extracts the answer and excludes surrounding site furniture", () => {
    const entry = getSource("gotquestions");
    expect(entry).toBeDefined();
    if (!entry) return;

    const extracted = extractContent(PAGE, entry.crawl);
    expect(extracted.title).toBe("What is Christian Platonism?");
    expect(extracted.text).toContain("Christian Platonism uses Plato’s philosophy");
    expect(extracted.text).toContain("Scripture remains authoritative");
    expect(extracted.text).not.toMatch(/Home|Donate|Related Articles|Copyright/);
  });
});

