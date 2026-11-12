import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/core/analysis.ts";
import { MIN_MARKER_DISTANCE, dist, layoutGraveyard, topDir, zombiePosition } from "../src/core/layout.ts";
import { SAMPLE_NOW, SAMPLE_SNAPSHOT } from "../src/core/sampleRepo.ts";

const g = classify(SAMPLE_SNAPSHOT, SAMPLE_NOW);

test("layout is deterministic", () => {
  assert.deepEqual(layoutGraveyard(g), layoutGraveyard(g));
});

test("different seeds differ", () => {
  assert.notDeepEqual(layoutGraveyard(g, 1).tombstones, layoutGraveyard(g, 2).tombstones);
});

test("all markers keep the minimum distance", () => {
  const l = layoutGraveyard(g);
  const pts = [...l.tombstones, ...l.lanterns].map((p) => p.pos);
  assert.equal(pts.length, g.tombstones.length + g.lanterns.length);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      assert.ok(dist(pts[i]!, pts[j]!) >= MIN_MARKER_DISTANCE, `markers ${i} and ${j} too close`);
    }
  }
});

test("one plot per top-level directory, plots do not overlap", () => {
  const l = layoutGraveyard(g);
  const dirs = new Set([...g.tombstones.map((t) => topDir(t.path)), ...g.lanterns.map((x) => topDir(x.path))]);
  assert.equal(l.plots.length, dirs.size);
  for (let i = 0; i < l.plots.length; i++) {
    for (let j = i + 1; j < l.plots.length; j++) {
      const a = l.plots[i]!;
      const b = l.plots[j]!;
      assert.ok(dist(a.center, b.center) >= a.radius + b.radius);
    }
  }
});

test("zombies get wander paths", () => {
  const l = layoutGraveyard(g);
  assert.equal(l.zombies.length, g.zombies.length);
  assert.ok(l.zombies.every((z) => z.radius > 0 && z.speed > 0));
});

test("zombie wander loops stay in the outskirts band, inside the fence", () => {
  const l = layoutGraveyard(g);
  const reach = l.plots.reduce((m, p) => Math.max(m, Math.hypot(p.center.x, p.center.z) + p.radius), 6);
  for (const z of l.zombies) {
    for (let k = 0; k < 400; k++) {
      const pos = zombiePosition(z, k * 0.7);
      const d = Math.hypot(pos.x, pos.z);
      assert.ok(d >= reach + 1.5 - 1e-9 && d <= reach + 7.5 + 1e-9, `zombie ${z.id} strayed to ${d - reach} past reach`);
    }
  }
});

test("empty graveyard lays out without error", () => {
  const l = layoutGraveyard({ repoName: "e", tombstones: [], lanterns: [], zombies: [] });
  assert.equal(l.plots.length, 0);
});
