import type { RepoSnapshot } from "../core/types.ts";

const TOKEN_KEY = "lenore.githubToken";
const CACHE_PREFIX = "lenore.repoCache.";
export const CACHE_TTL_MS = 3_600_000;

interface CacheEntry {
  savedAt: number;
  snapshot: RepoSnapshot;
}

function store(kind: "session" | "local"): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Token lives in sessionStorage only: gone when the tab closes. Never logged. */
export function readToken(): string | null {
  const t = store("session")?.getItem(TOKEN_KEY);
  return t ? t : null;
}

export function writeToken(token: string): void {
  const t = token.trim();
  if (t === "") return;
  try {
    store("session")?.setItem(TOKEN_KEY, t);
  } catch {
    // storage blocked: the token simply is not kept
  }
}

export function clearToken(): void {
  try {
    store("session")?.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function readCache(ownerRepo: string, nowMs: number): RepoSnapshot | null {
  try {
    const raw = store("local")?.getItem(CACHE_PREFIX + ownerRepo.toLowerCase());
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (typeof entry.savedAt !== "number" || nowMs - entry.savedAt > CACHE_TTL_MS || nowMs < entry.savedAt) return null;
    return entry.snapshot;
  } catch {
    return null;
  }
}

export function writeCache(ownerRepo: string, snapshot: RepoSnapshot, nowMs: number): void {
  try {
    store("local")?.setItem(CACHE_PREFIX + ownerRepo.toLowerCase(), JSON.stringify({ savedAt: nowMs, snapshot }));
  } catch {
    // quota or blocked storage: skip caching
  }
}
