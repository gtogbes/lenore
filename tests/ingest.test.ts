import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/core/analysis.ts";
import { decodeBase64Utf8, fetchGithubSnapshot, parseGithubRepo } from "../src/core/githubIngest.ts";

const NOW = new Date("2026-10-31T00:00:00Z");
const commit = (sha: string, date: string, message = "init") => ({ sha: sha.padEnd(40, "0"), commit: { message, author: { name: "Ann", date } } });

test("parseGithubRepo maps tree and commits", () => {
  const snap = parseGithubRepo({
    repo: "o/r",
    now: NOW,
    tree: {
      tree: [
        { path: "src/a.ts", type: "blob", size: 3200 },
        { path: "node_modules/x/index.js", type: "blob", size: 10 },
        { path: "src", type: "tree" },
        { path: "logo.png", type: "blob", size: 99 },
      ],
    },
    commitsByPath: {
      "src/a.ts": [commit("aaaaaaa1", "2026-10-20T00:00:00Z", "new"), commit("bbbbbbb2", "2026-01-01T00:00:00Z"), commit("ccccccc3", "2025-01-01T00:00:00Z")],
    },
    packageJson: { dependencies: { react: "^18.2.0" } },
  });
  assert.equal(snap.name, "o/r");
  assert.equal(snap.files.length, 1);
  assert.equal(snap.files[0]!.commits90d, 1);
  assert.equal(snap.files[0]!.lastCommit.sha, "aaaaaaa");
  assert.equal(snap.files[0]!.loc, 100);
  assert.equal(snap.deps[0]!.current, "18.2.0");
});

test("files without commit history are skipped", () => {
  const snap = parseGithubRepo({ repo: "o/r", now: NOW, tree: { tree: [{ path: "a.ts", type: "blob" }] }, commitsByPath: {} });
  assert.equal(snap.files.length, 0);
});

test("rate limit is reported gracefully", async () => {
  const res = await fetchGithubSnapshot("o/r", async () => ({
    ok: false,
    status: 403,
    headers: { get: (n: string) => (n === "x-ratelimit-remaining" ? "0" : "1900000000") },
    json: async () => ({}),
  }), NOW);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.rateLimited, true);
    assert.ok(res.error.includes("rate limit"));
  }
});

test("other failures do not throw", async () => {
  const res = await fetchGithubSnapshot("o/r", async () => {
    throw new Error("offline");
  }, NOW);
  assert.equal(res.ok, false);
});

test("a 403 with quota left is not reported as a rate limit", async () => {
  const res = await fetchGithubSnapshot("o/r", async () => ({
    ok: false,
    status: 403,
    headers: { get: (n: string) => (n === "x-ratelimit-remaining" ? "42" : null) },
    json: async () => ({}),
  }), NOW);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.rateLimited, false);
    assert.ok(res.error.includes("403"));
  }
});

test("a 404 explains that the repo was not found", async () => {
  const res = await fetchGithubSnapshot("o/r", async () => ({ ok: false, status: 404, headers: { get: () => null }, json: async () => ({}) }), NOW);
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.error.includes("not found"));
});

test("parseGithubRepo uses registry data so ingested deps can become zombies", () => {
  const snap = parseGithubRepo({
    repo: "o/r",
    now: NOW,
    tree: { tree: [] },
    commitsByPath: {},
    packageJson: { dependencies: { old: "^1.2.0", fresh: "^2.0.0" } },
    registry: { old: { latest: "3.0.1", deprecated: false }, fresh: { latest: "2.1.0", deprecated: true } },
  });
  const old = snap.deps.find((d) => d.name === "old")!;
  assert.equal(old.latest, "3.0.1");
  assert.equal(snap.deps.find((d) => d.name === "fresh")!.deprecated, true);
  const g = classify(snap, NOW);
  assert.equal(g.zombies.length, 2);
});

test("fetchGithubSnapshot reads package.json and registry data", async () => {
  const pkg = "eyJkZXBlbmRlbmNpZXMiOnsib2xkIjoiXjEuMC4wIn19";
  const body = (url: string): unknown => {
    if (url.includes("/git/trees/")) return { tree: [{ path: "a.ts", type: "blob", size: 64 }] };
    if (url.includes("/contents/package.json")) return { encoding: "base64", content: pkg };
    if (url.includes("registry.npmjs.org")) return { version: "4.0.0" };
    return [commit("abcdef12", "2026-10-20T00:00:00Z")];
  };
  const res = await fetchGithubSnapshot("o/r", async (url) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body(url) }), NOW);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.snapshot.deps[0]!.latest, "4.0.0");
    assert.equal(classify(res.snapshot, NOW).zombies.length, 1);
  }
});

test("decodeBase64Utf8 handles padding, newlines and multibyte text", () => {
  assert.equal(decodeBase64Utf8("eyJhIjoxfQ=="), '{"a":1}');
  assert.equal(decodeBase64Utf8("eyJh\nIjox\nfQ=="), '{"a":1}');
  assert.equal(decodeBase64Utf8("w6k="), "\u00e9");
});

test("dependency ranges without digits are not flagged as major-behind zombies", () => {
  const snap = parseGithubRepo({
    repo: "o/r",
    now: NOW,
    tree: { tree: [] },
    commitsByPath: {},
    packageJson: { dependencies: { a: "*", b: "latest", c: "workspace:*", d: "^2.0.0" } },
    registry: {
      a: { latest: "5.1.0", deprecated: false },
      b: { latest: "3.0.0", deprecated: false },
      c: { latest: "2.0.0", deprecated: false },
      d: { latest: "2.1.0", deprecated: false },
    },
  });
  const byName = Object.fromEntries(snap.deps.map((d) => [d.name, d]));
  assert.equal(byName.a!.current, "5.1.0");
  assert.equal(byName.d!.current, "2.0.0");
  assert.equal(classify(snap, NOW).zombies.length, 0);
});

test("digit-less ranges without registry data stay quiet", () => {
  const snap = parseGithubRepo({ repo: "o/r", now: NOW, tree: { tree: [] }, commitsByPath: {}, packageJson: { dependencies: { a: "*" } } });
  assert.equal(snap.deps[0]!.current, snap.deps[0]!.latest);
  assert.equal(classify(snap, NOW).zombies.length, 0);
});

type Call = { url: string; init?: { headers?: Record<string, string> } };
function recorder(status = 200) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, init });
    let body: unknown = {};
    if (url.includes("/git/trees/")) body = { tree: [{ path: "a.ts", type: "blob", size: 64 }] };
    else if (url.includes("/commits")) body = [commit("abc", "2026-10-20T00:00:00Z")];
    else if (url.includes("/contents/package.json")) body = { encoding: "base64", content: "eyJkZXBlbmRlbmNpZXMiOnsibGVmdC1wYWQiOiIxLjAuMCJ9fQ==" };
    else if (url.includes("registry.npmjs.org")) body = { version: "1.3.0" };
    return { ok: status === 200, status, headers: { get: () => null }, json: async () => body };
  };
  return { calls, fetcher };
}

test("no token sends no init and no Authorization header", async () => {
  const { calls, fetcher } = recorder();
  const res = await fetchGithubSnapshot("o/r", fetcher, NOW);
  assert.equal(res.ok, true);
  assert.ok(calls.length > 3);
  for (const c of calls) assert.equal(c.init, undefined);
});

test("a token goes to api.github.com only, never the registry", async () => {
  const { calls, fetcher } = recorder();
  const res = await fetchGithubSnapshot("o/r", fetcher, NOW, 40, "tok123");
  assert.equal(res.ok, true);
  const gh = calls.filter((c) => c.url.startsWith("https://api.github.com/"));
  const npm = calls.filter((c) => c.url.startsWith("https://registry.npmjs.org/"));
  assert.ok(gh.length >= 3);
  assert.ok(npm.length >= 1);
  for (const c of gh) assert.equal(c.init?.headers?.Authorization, "Bearer tok123");
  for (const c of npm) assert.equal(c.init, undefined);
});

test("a blank token is treated as no token", async () => {
  const { calls, fetcher } = recorder();
  await fetchGithubSnapshot("o/r", fetcher, NOW, 40, "  ");
  for (const c of calls) assert.equal(c.init, undefined);
});

test("401 gives a clear bad token message", async () => {
  const { fetcher } = recorder(401);
  const res = await fetchGithubSnapshot("o/r", fetcher, NOW, 40, "bad");
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.rateLimited, false);
    assert.ok(res.error.includes("rejected the token"));
  }
});

test("resetAt is propagated on rate limit", async () => {
  const res = await fetchGithubSnapshot("o/r", async () => ({
    ok: false,
    status: 403,
    headers: { get: (n: string) => (n === "x-ratelimit-remaining" ? "0" : "1900000000") },
    json: async () => ({}),
  }), NOW);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.resetAt?.getTime(), 1900000000 * 1000);
});
