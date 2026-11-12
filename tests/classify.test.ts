import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, lanternHeat, majorOf, zombieReasons, tombstoneReasons } from "../src/core/analysis.ts";
import type { FileInfo, RepoSnapshot } from "../src/core/types.ts";

const NOW = new Date("2026-10-31T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function file(over: Partial<FileInfo> & { path: string }, ageDays = 5): FileInfo {
  return {
    loc: 100,
    lastCommit: { sha: "abc1234", message: "msg", author: "Ann", date: day(ageDays) },
    commits90d: 0,
    imports: [],
    exports: [{ name: "x", usedBy: 2 }],
    ...over,
  };
}

test("stale at exactly 180 days, not at 179", () => {
  assert.deepEqual(tombstoneReasons(file({ path: "a.ts" }, 180), NOW), ["stale"]);
  assert.deepEqual(tombstoneReasons(file({ path: "a.ts" }, 179), NOW), []);
});

test("deprecated marker and unused exports", () => {
  assert.ok(tombstoneReasons(file({ path: "a.ts", deprecated: true }), NOW).includes("deprecated"));
  const unused = file({ path: "a.ts", exports: [{ name: "x", usedBy: 0 }, { name: "y", usedBy: 0 }] });
  assert.ok(tombstoneReasons(unused, NOW).includes("unused-exports"));
  const partly = file({ path: "a.ts", exports: [{ name: "x", usedBy: 0 }, { name: "y", usedBy: 1 }] });
  assert.deepEqual(tombstoneReasons(partly, NOW), []);
  assert.deepEqual(tombstoneReasons(file({ path: "a.ts", exports: [] }), NOW), []);
});

test("lantern threshold and heat bounds", () => {
  const snap: RepoSnapshot = {
    name: "r",
    deps: [],
    files: [file({ path: "cold.ts", commits90d: 4 }), file({ path: "warm.ts", commits90d: 5 }), file({ path: "hot.ts", commits90d: 99 })],
  };
  const g = classify(snap, NOW);
  assert.deepEqual(g.lanterns.map((l) => l.path), ["warm.ts", "hot.ts"]);
  assert.equal(g.lanterns[1]?.heat, 1);
  assert.equal(lanternHeat(0), 0);
  assert.ok(g.lanterns.every((l) => l.heat >= 0 && l.heat <= 1));
});

test("a tombstone is never also a lantern", () => {
  const g = classify({ name: "r", deps: [], files: [file({ path: "a.ts", commits90d: 20, deprecated: true })] }, NOW);
  assert.equal(g.tombstones.length, 1);
  assert.equal(g.lanterns.length, 0);
});

test("zombie rules", () => {
  const dep = (over: object) => ({ name: "d", current: "1.0.0", latest: "1.2.0", lastRelease: day(10), deprecated: false, ...over });
  assert.deepEqual(zombieReasons(dep({}), NOW), []);
  assert.deepEqual(zombieReasons(dep({ deprecated: true }), NOW), ["deprecated"]);
  assert.deepEqual(zombieReasons(dep({ latest: "2.0.0" }), NOW), ["major-behind"]);
  assert.deepEqual(zombieReasons(dep({ lastRelease: day(730) }), NOW), ["abandoned"]);
  assert.deepEqual(zombieReasons(dep({ lastRelease: day(729) }), NOW), []);
});

test("majorOf parses range prefixes", () => {
  assert.equal(majorOf("^4.17.1"), 4);
  assert.equal(majorOf("v2.0.0"), 2);
  assert.equal(majorOf("latest"), 0);
});
