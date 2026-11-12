import { test } from "node:test";
import assert from "node:assert/strict";
import { EPITAPH_MAX, makeEpitaph } from "../src/core/epitaph.ts";

const commit = (message: string, author = "Mortimer Vale") => ({ sha: "deadbee", message, author, date: "2023-04-01T00:00:00Z" });

test("epitaph includes message, author and year", () => {
  const e = makeEpitaph(commit("quick hack"), "a.ts");
  assert.ok(e.includes("quick hack"));
  assert.ok(e.includes("Mortimer Vale"));
  assert.ok(e.includes("2023"));
});

test("epitaph is bounded and deterministic", () => {
  const long = commit("x".repeat(500), "y".repeat(200));
  const e = makeEpitaph(long, "a.ts");
  assert.ok(e.length <= EPITAPH_MAX);
  assert.equal(e, makeEpitaph(long, "a.ts"));
  assert.ok(makeEpitaph(commit(""), "a.ts").length <= EPITAPH_MAX);
});

test("only the first message line is used", () => {
  const e = makeEpitaph(commit("subject\n\nlong body here"), "a.ts");
  assert.ok(!e.includes("body"));
});
