import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

const TAG_PATTERN = /^[a-z][a-z0-9_-]*:[A-Za-z0-9_*.-]+$/;

export const SourceMetaSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  license: z.string().optional(),
  description: z.string().optional(),
  tags: z
    .array(
      z
        .string()
        .regex(
          TAG_PATTERN,
          "tag must be `namespace:value`, e.g. `audience:public`",
        ),
    )
    .min(1),
});

export type SourceMeta = z.infer<typeof SourceMetaSchema>;

export interface DocumentFile {
  /** Relative to corpus/<source>/ — used as the stable identifier. */
  path: string;
  absolutePath: string;
  title: string | null;
  url: string | null;
  text: string;
  contentHash: string;
}

export interface LoadedSource {
  name: string;
  meta: SourceMeta;
  rootDir: string;
  documents: DocumentFile[];
  /** sha256 over sorted (path, contents) pairs. Source-level reindex gate. */
  contentHash: string;
}

export interface DiscoverOptions {
  /** Directory containing source subdirectories. */
  corpusDir: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

/**
 * Walk corpus/, locate every directory with a source.yaml, parse + validate it,
 * load all document files, and compute the per-source content hash.
 */
export async function discoverSources(
  options: DiscoverOptions,
): Promise<LoadedSource[]> {
  const entries = await readdir(options.corpusDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  const sources: LoadedSource[] = [];
  for (const dir of dirs) {
    const root = path.join(options.corpusDir, dir.name);
    const metaPath = path.join(root, "source.yaml");
    if (!existsSync(metaPath)) {
      throw new Error(
        `corpus subdirectory ${dir.name} has no source.yaml — refusing to index. See README.md.`,
      );
    }
    const metaRaw = await readFile(metaPath, "utf8");
    const parsedYaml = YAML.parse(metaRaw);
    const meta = SourceMetaSchema.parse(parsedYaml);

    const documents = await loadDocuments(root);
    const contentHash = hashSource(documents);
    sources.push({
      name: meta.name,
      meta,
      rootDir: root,
      documents,
      contentHash,
    });
  }
  return sources;
}

async function loadDocuments(root: string): Promise<DocumentFile[]> {
  const out: DocumentFile[] = [];
  await walk(root, root, out);
  // Sort by path for deterministic hashing.
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

async function walk(
  root: string,
  current: string,
  out: DocumentFile[],
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "source.yaml") continue;
    if (e.name.startsWith(".")) continue;
    const abs = path.join(current, e.name);
    if (e.isDirectory()) {
      await walk(root, abs, out);
      continue;
    }
    const st = await stat(abs);
    if (!st.isFile()) continue;
    if (!/\.(md|markdown|txt)$/i.test(e.name)) continue;
    const text = await readFile(abs, "utf8");
    const { title, url, body } = parseFrontmatter(text);
    const rel = path.relative(root, abs);
    const contentHash = sha256(`${rel}\n${body}`);
    out.push({
      path: rel,
      absolutePath: abs,
      title,
      url,
      text: body,
      contentHash,
    });
  }
}

function parseFrontmatter(raw: string): {
  title: string | null;
  url: string | null;
  body: string;
} {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { title: null, url: null, body: raw };
  let title: string | null = null;
  let url: string | null = null;
  try {
    const fm = YAML.parse(m[1]) as Record<string, unknown> | null;
    if (fm) {
      if (typeof fm.title === "string") title = fm.title;
      if (typeof fm.url === "string") url = fm.url;
    }
  } catch {
    // Malformed frontmatter — fall through with body == full raw.
    return { title: null, url: null, body: raw };
  }
  return { title, url, body: m[2] };
}

function hashSource(docs: DocumentFile[]): string {
  const h = createHash("sha256");
  for (const d of docs) {
    h.update(d.path);
    h.update("\0");
    h.update(d.text);
    h.update("\0");
  }
  return h.digest("hex");
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
