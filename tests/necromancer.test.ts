import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/core/analysis.ts";
import { MockNecromancer, planRitual } from "../src/core/necromancer.ts";
import { SAMPLE_NOW, SAMPLE_SNAPSHOT } from "../src/core/sampleRepo.ts";

const g = classify(SAMPLE_SNAPSHOT, SAMPLE_NOW);

test("planRitual is deterministic for every tombstone", () => {
  for (const t of g.tombstones) {
    assert.deepEqual(planRitual(t), planRitual(t));
  }
});

test("plans are well formed", () => {
  for (const t of g.tombstones) {
    const p = planRitual(t);
    assert.equal(p.tombstoneId, t.id);
    assert.ok(["bury", "revive", "refactor"].includes(p.verdict));
    assert.ok(p.steps.length >= 3);
    assert.ok(p.diff.includes(t.path));
    assert.ok(p.summary.length > 0);
  }
});

test("mock necromancer resolves offline", async () => {
  const n = new MockNecromancer();
  const t = g.tombstones[0]!;
  assert.deepEqual(await n.resurrect(t), planRitual(t));
});
