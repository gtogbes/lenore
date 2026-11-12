import type { Dependency, FileInfo, RepoSnapshot } from "./types.ts";

// Minimal shapes of the GitHub REST payloads we read.
export interface GhTreeEntry {
  path: string;
  type: string;
  size?: number;
}
export interface GhTree {
  tree: GhTreeEntry[];
}
export interface GhCommit {
  sha: string;
  commit: { message: string; author?: { name?: string; date?: string } | null };
}

export interface RegistryInfo {
  latest: string;
  deprecated: boolean;
}

export interface GhParseInput {
  repo: string;
  tree: GhTree;
  /** Commits per file path, newest first, as returned by `GET /commits?path=`. */
  commitsByPath: Record<string, GhCommit[]>;
  /** Parsed package.json content, if available. */
  packageJson?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  /** Latest published version per dependency name, from the npm registry, if it could be fetched. */
  registry?: Record<string, RegistryInfo>;
  /** Reference time for the 90 day window. */
  now: Date;
}

/** Cap on npm registry lookups per load. */
const MAX_REGISTRY_LOOKUPS = 40;
const DAY_MS = 86_400_000;
const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|md|sh)$/;
const IGNORE_RE = /(^|\/)(node_modules|dist|build|vendor|\.git)\//;

/** Pure: GitHub tree plus commit JSON into a RepoSnapshot. */
export function parseGithubRepo(input: GhParseInput): RepoSnapshot {
  const files: FileInfo[] = [];
  const cutoff = input.now.getTime() - 90 * DAY_MS;
  for (const entry of input.tree.tree) {
    if (entry.type !== "blob" || !CODE_RE.test(entry.path) || IGNORE_RE.test(entry.path)) continue;
    const commits = input.commitsByPath[entry.path];
    const last = commits?.[0];
    if (!last) continue;
    const recent = (commits ?? []).filter((c) => {
      const t = new Date(c.commit.author?.date ?? 0).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;
    files.push({
      path: entry.path,
      loc: Math.max(1, Math.round((entry.size ?? 0) / 32)),
      lastCommit: {
        sha: last.sha.slice(0, 7),
        message: last.commit.message,
        author: last.commit.author?.name ?? "unknown",
        date: last.commit.author?.date ?? input.now.toISOString(),
      },
      commits90d: recent,
      imports: [],
      exports: [],
    });
  }
  const deps: Dependency[] = [];
  const all = { ...input.packageJson?.devDependencies, ...input.packageJson?.dependencies };
  for (const name of Object.keys(all).sort()) {
    const info = input.registry?.[name];
    // Ranges without a leading version ("*", "latest", "workspace:*") have no real current version:
    // treat them as up to date instead of inventing 0.0.0, which would read as major-behind.
    const range = String(all[name]).trim();
    const hasVersion = /^[\^~<>=v\s]*\d/.test(range);
    const current = hasVersion ? range.replace(/^[^\d]*/, "") : (info?.latest ?? "0.0.0");
    // The registry's /latest document has no publish date, so lastRelease stays "now": the 2 year rule
    // never fires for ingested repos, but deprecated and major-behind do.
    deps.push({
      name,
      current,
      latest: info?.latest ?? current,
      lastRelease: input.now.toISOString(),
      deprecated: info?.deprecated ?? false,
    });
  }
  return { name: input.repo, files, deps };
}

export class RateLimitError extends Error {
  readonly resetAt: Date | null;
  constructor(message: string, resetAt: Date | null) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

export type IngestResult =
  | { ok: true; snapshot: RepoSnapshot }
  | { ok: false; error: string; rateLimited: boolean; resetAt?: Date | null };

export type FetchInit = { headers?: Record<string, string> };

type Fetcher = (url: string, init?: FetchInit) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

/** Calls GitHub. The token, if any, goes only here and never to the npm registry. */
async function getJson<T>(fetcher: Fetcher, url: string, token?: string): Promise<T> {
  const res = token ? await fetcher(url, { headers: { Authorization: `Bearer ${token}` } }) : await fetcher(url);
  // A 403 is a rate limit only when the quota is spent (or the header is absent); otherwise it is a block.
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 429 || (res.status === 403 && (remaining === null || remaining === "0"))) {
    const reset = res.headers.get("x-ratelimit-reset");
    throw new RateLimitError(
      "GitHub rate limit reached. Try again later, or use the built-in sample graveyard.",
      reset ? new Date(Number(reset) * 1000) : null,
    );
  }
  if (res.status === 401) throw new Error("GitHub rejected the token. Check it, or forget it to use unauthenticated requests.");
  if (res.status === 403) throw new Error("GitHub refused the request (403). The repo may be private or blocked.");
  if (res.status === 404) throw new Error("Repo not found. Check the name, and note that only public repos work.");
  if (!res.ok) throw new Error(`GitHub request failed with status ${res.status}`);
  return (await res.json()) as T;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Pure base64 to UTF-8 text decoder (core has no atob or Buffer). Whitespace is ignored. */
export function decodeBase64Utf8(b64: string): string {
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of b64) {
    const v = B64.indexOf(ch);
    if (v < 0) continue; // whitespace and padding
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++] as number;
    const extra = b >= 0xf0 ? 3 : b >= 0xe0 ? 2 : b >= 0xc0 ? 1 : 0;
    let cp = extra === 0 ? b : b & (0x3f >> extra);
    for (let k = 0; k < extra && i < bytes.length; k++) cp = (cp << 6) | ((bytes[i++] as number) & 0x3f);
    out += String.fromCodePoint(cp);
  }
  return out;
}

type PackageJson = NonNullable<GhParseInput["packageJson"]>;

/** Best effort: the repo's root package.json, or undefined when absent or unreadable. */
async function fetchPackageJson(fetcher: Fetcher, base: string, token?: string): Promise<PackageJson | undefined> {
  try {
    const doc = await getJson<{ content?: string; encoding?: string }>(fetcher, `${base}/contents/package.json`, token);
    if (doc.encoding !== "base64" || typeof doc.content !== "string") return undefined;
    const parsed: unknown = JSON.parse(decodeBase64Utf8(doc.content));
    return typeof parsed === "object" && parsed !== null ? (parsed as PackageJson) : undefined;
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    return undefined;
  }
}

/** Best effort: npm registry lookups for at most `limit` dependencies. Failures just skip that dependency. */
async function fetchRegistry(fetcher: Fetcher, names: string[], limit: number): Promise<Record<string, RegistryInfo>> {
  const out: Record<string, RegistryInfo> = {};
  for (const name of names.slice(0, limit)) {
    try {
      const res = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
      if (!res.ok) continue;
      const doc = (await res.json()) as { version?: unknown; deprecated?: unknown };
      if (typeof doc.version === "string") out[name] = { latest: doc.version, deprecated: Boolean(doc.deprecated) };
    } catch {
      // offline or blocked registry: this dependency keeps latest = current
    }
  }
  return out;
}

/**
 * Fetch a public repo (owner/name). Never throws; returns a typed result.
 * GitHub cost: 1 tree request, 1 package.json request and one commits request per file, so at most
 * 2 + maxFiles (42 by default) of the 60 unauthenticated requests per hour (5,000 with a token). Registry lookups go to npm, not GitHub.
 */
export async function fetchGithubSnapshot(
  ownerRepo: string,
  fetcher: Fetcher,
  now: Date,
  maxFiles = 40,
  token?: string,
): Promise<IngestResult> {
  const auth = token && token.trim() !== "" ? token.trim() : undefined;
  try {
    const base = `https://api.github.com/repos/${ownerRepo}`;
    const tree = await getJson<GhTree>(fetcher, `${base}/git/trees/HEAD?recursive=1`, auth);
    const candidates = tree.tree
      .filter((e) => e.type === "blob" && CODE_RE.test(e.path) && !IGNORE_RE.test(e.path))
      .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
      .slice(0, maxFiles);
    const commitsByPath: Record<string, GhCommit[]> = {};
    for (const e of candidates) {
      commitsByPath[e.path] = await getJson<GhCommit[]>(
        fetcher,
        `${base}/commits?per_page=30&path=${encodeURIComponent(e.path)}`,
        auth,
      );
    }
    const packageJson = await fetchPackageJson(fetcher, base, auth);
    const depNames = Object.keys({ ...packageJson?.devDependencies, ...packageJson?.dependencies }).sort();
    const registry = await fetchRegistry(fetcher, depNames, MAX_REGISTRY_LOOKUPS);
    return {
      ok: true,
      snapshot: parseGithubRepo({ repo: ownerRepo, tree: { tree: candidates }, commitsByPath, packageJson, registry, now }),
    };
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message, rateLimited: true, resetAt: err.resetAt };
    return { ok: false, error: err instanceof Error ? err.message : String(err), rateLimited: false };
  }
}
