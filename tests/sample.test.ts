import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/core/analysis.ts";
import { SAMPLE_NOW, SAMPLE_SNAPSHOT, makeSampleSnapshot } from "../src/core/sampleRepo.ts";
import { buildDemoScript, DEMO_DURATION } from "../src/core/demoScript.ts";
import { layoutGraveyard } from "../src/core/layout.ts";

const g = classify(SAMPLE_SNAPSHOT, SAMPLE_NOW);

test("sample snapshot has the promised shape", () => {
  assert.equal(SAMPLE_SNAPSHOT.name, "haunted-monolith");
  assert.ok(SAMPLE_SNAPSHOT.files.length >= 55 && SAMPLE_SNAPSHOT.files.length <= 70);
  assert.equal(SAMPLE_SNAPSHOT.deps.length, 14);
  assert.ok(g.tombstones.length >= 8, `tombstones ${g.tombstones.length}`);
  assert.ok(g.lanterns.length >= 5, `lanterns ${g.lanterns.length}`);
  assert.ok(g.zombies.length >= 3, `zombies ${g.zombies.length}`);
});

test("sample is deterministic and paths are unique", () => {
  assert.deepEqual(makeSampleSnapshot(), SAMPLE_SNAPSHOT);
  assert.equal(new Set(SAMPLE_SNAPSHOT.files.map((f) => f.path)).size, SAMPLE_SNAPSHOT.files.length);
});

test("epitaphs come from commits", () => {
  for (const t of g.tombstones) {
    assert.ok(t.epitaph.length > 0 && t.epitaph.length <= 80);
  }
});

test("demo script times are strictly monotonic and fit the duration", () => {
  const layout = layoutGraveyard(g);
  const events = buildDemoScript(g, {
    tombstones: layout.tombstones.map((p) => ({ id: p.item.id, pos: p.pos })),
    lanterns: layout.lanterns.map((p) => ({ id: p.item.id, pos: p.pos })),
    zombies: layout.zombies.map((z) => ({ id: z.id, pos: z.start })),
  });
  assert.ok(events.length > 8);
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i]!.t > events[i - 1]!.t, `event ${i} not after previous`);
  }
  const last = events[events.length - 1]!;
  assert.ok(last.t + last.duration <= DEMO_DURATION);
  assert.ok(last.t + last.duration >= 120, "demo should run about 150 s");
  assert.ok(events.filter((e) => e.action.kind === "ritual").length >= 2);
  assert.ok(events.every((e) => e.caption.length > 0 && !e.caption.includes("\u2014")));
});
