import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../../src/core/analysis.ts";
import { makeEpitaph, EPITAPH_MAX } from "../../src/core/epitaph.ts";
import { MIN_MARKER_DISTANCE, dist, layoutGraveyard } from "../../src/core/layout.ts";
import type { RepoSnapshot } from "../../src/core/types.ts";

// fast-check is a dev dependency. When it is not installed these tests skip instead of failing.
let fc: any = null;
try {
  fc = (await import("fast-check")).default ?? (await import("fast-check"));
} catch {
  fc = null;
}

const NOW = new Date("2026-10-31T00:00:00Z");
const skip = fc ? false : "fast-check not installed";

function snapshotArb() {
  const commit = fc.record({
    sha: fc.string({ minLength: 7, maxLength: 7 }),
    message: fc.string({ maxLength: 300 }),
    author: fc.string({ maxLength: 120 }),
    date: fc.integer({ min: 1_400_000_000_000, max: 1_793_000_000_000 }).map((n: number) => new Date(n).toISOString()),
  });
  const file = fc.record({
    path: fc.array(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 1, maxLength: 3 }).map((p: string[]) => p.join("/") + ".ts"),
    loc: fc.integer({ min: 1, max: 5000 }),
    lastCommit: commit,
    commits90d: fc.integer({ min: 0, max: 60 }),
    imports: fc.constant([]),
    exports: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 8 }), usedBy: fc.integer({ min: 0, max: 5 }) }), { maxLength: 3 }),
    deprecated: fc.boolean(),
  });
  const dep = fc.record({
    name: fc.string({ minLength: 1, maxLength: 10 }),
    current: fc.constantFrom("1.0.0", "2.3.4", "^0.9.1", "x"),
    latest: fc.constantFrom("1.0.0", "3.0.0", "5.1.0", ""),
    lastRelease: fc.integer({ min: 1_400_000_000_000, max: 1_793_000_000_000 }).map((n: number) => new Date(n).toISOString()),
    deprecated: fc.boolean(),
  });
  return fc.record({
    name: fc.constant("pbt"),
    files: fc.array(file, { maxLength: 40 }).map((fs: { path: string }[]) => {
      const seen = new Set<string>();
      return fs.filter((f) => (seen.has(f.path) ? false : (seen.add(f.path), true)));
    }),
    deps: fc.array(dep, { maxLength: 10 }),
  });
}

test("PBT: layout never overlaps markers", { skip }, () => {
  fc.assert(
    fc.property(snapshotArb(), (snap: RepoSnapshot) => {
      const l = layoutGraveyard(classify(snap, NOW));
      const pts = [...l.tombstones, ...l.lanterns].map((p) => p.pos);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          if (dist(pts[i]!, pts[j]!) < MIN_MARKER_DISTANCE) return false;
        }
      }
      return true;
    }),
    { numRuns: 100 },
  );
});

test("PBT: classify is total and deterministic", { skip }, () => {
  fc.assert(
    fc.property(snapshotArb(), (snap: RepoSnapshot) => {
      const a = classify(snap, NOW);
      const b = classify(snap, NOW);
      assert.deepEqual(a, b);
      const tombPaths = new Set(a.tombstones.map((t) => t.path));
      return a.lanterns.every((x) => !tombPaths.has(x.path) && x.heat >= 0 && x.heat <= 1);
    }),
    { numRuns: 100 },
  );
});

test("PBT: epitaph never exceeds the bound", { skip }, () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 400 }), fc.string({ maxLength: 200 }), (message: string, author: string) => {
      const e = makeEpitaph({ sha: "abcdef0", message, author, date: "2024-01-01T00:00:00Z" }, "p.ts");
      return e.length <= EPITAPH_MAX;
    }),
    { numRuns: 200 },
  );
});
