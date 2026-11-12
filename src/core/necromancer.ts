import type { RitualPlan, RitualStep, RitualVerdict, Tombstone } from "./types.ts";
import { hashString, mulberry32 } from "./prng.ts";

export interface Necromancer {
  readonly name: string;
  resurrect(tombstone: Tombstone): Promise<RitualPlan>;
}

const INCANTATIONS = [
  "By moonlight and merge conflict, I wake thee.",
  "Let the stale imports crumble to dust.",
  "From the grave of git blame, rise anew.",
  "Candles for the callers who never came.",
  "The linter has spoken. The tests have wept.",
];

function chooseVerdict(t: Tombstone, roll: number): RitualVerdict {
  const unused = t.reasons.includes("unused-exports");
  const deprecated = t.reasons.includes("deprecated");
  if (unused && t.daysSinceCommit >= 365) return "bury";
  if (deprecated) return roll < 0.5 ? "refactor" : "bury";
  if (unused) return "bury";
  return roll < 0.5 ? "revive" : "refactor";
}

function stepsFor(verdict: RitualVerdict, path: string, rng: () => number): RitualStep[] {
  const line = () => INCANTATIONS[Math.floor(rng() * INCANTATIONS.length)] as string;
  const common: RitualStep[] = [
    { title: `Exhume ${path}`, incantation: line() },
    { title: "Read the last rites (git log, call sites)", incantation: line() },
  ];
  if (verdict === "bury") {
    return [
      ...common,
      { title: "Confirm no living callers remain", incantation: line() },
      { title: "Delete the file and its exports", incantation: line() },
    ];
  }
  if (verdict === "refactor") {
    return [
      ...common,
      { title: "Replace deprecated paths with the modern API", incantation: line() },
      { title: "Add a test so it cannot die quietly again", incantation: line() },
    ];
  }
  return [
    ...common,
    { title: "Refresh stale code and drop dead exports", incantation: line() },
    { title: "Wire it back into a living module", incantation: line() },
  ];
}

function diffFor(verdict: RitualVerdict, t: Tombstone): string {
  const base = t.path;
  if (verdict === "bury") {
    return [
      `--- a/${base}`,
      `+++ /dev/null`,
      `@@ -1,${Math.max(1, t.loc)} +0,0 @@`,
      `-// ${t.epitaph}`,
      `-// ${t.loc} lines laid to rest`,
    ].join("\n");
  }
  if (verdict === "refactor") {
    return [
      `--- a/${base}`,
      `+++ b/${base}`,
      `@@ -1,4 +1,5 @@`,
      `-// @deprecated legacy implementation`,
      `+// Modernized by the Necromancer`,
      ` export function main() {`,
      `-  return legacy();`,
      `+  return modern();`,
      ` }`,
    ].join("\n");
  }
  return [
    `--- a/${base}`,
    `+++ b/${base}`,
    `@@ -1,3 +1,3 @@`,
    `-// last touched ${t.daysSinceCommit} days ago`,
    `+// revived and reviewed`,
    ` export const alive = true;`,
  ].join("\n");
}

function summaryFor(verdict: RitualVerdict, t: Tombstone): string {
  if (verdict === "bury") return `${t.path} has no living callers. Bury it and ship ${t.loc} fewer lines.`;
  if (verdict === "refactor") return `${t.path} still matters but leans on deprecated ground. Refactor it.`;
  return `${t.path} is only sleeping. Revive it with a small refresh and a test.`;
}

/** Pure, deterministic plan for a tombstone. Same input always yields the same plan. */
export function planRitual(t: Tombstone): RitualPlan {
  const rng = mulberry32(hashString(t.id + t.lastCommit.sha));
  const verdict = chooseVerdict(t, rng());
  return {
    tombstoneId: t.id,
    path: t.path,
    verdict,
    steps: stepsFor(verdict, t.path, rng),
    diff: diffFor(verdict, t),
    summary: summaryFor(verdict, t),
  };
}

/** Offline mock Necromancer. Works with no network and no API key. */
export class MockNecromancer implements Necromancer {
  readonly name = "Mock Necromancer (offline)";
  async resurrect(tombstone: Tombstone): Promise<RitualPlan> {
    return planRitual(tombstone);
  }
}

export function createNecromancer(): Necromancer {
  return new MockNecromancer();
}
