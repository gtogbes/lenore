# Lenore: structure steering

```
src/core/      Pure domain logic (no React or Three)
  types.ts       RepoSnapshot, Graveyard, RitualPlan, layout types
  prng.ts        mulberry32, hashString
  analysis.ts    classify(snapshot, now) -> Graveyard
  epitaph.ts     makeEpitaph(commit, path), 80 char bound
  layout.ts      layoutGraveyard(graveyard, seed), plots, min distance, zombie paths
  necromancer.ts Necromancer interface + MockNecromancer + planRitual
  sampleRepo.ts  haunted-monolith snapshot from a seeded PRNG
  demoScript.ts  buildDemoScript(graveyard, anchors) ~150 s timeline
  githubIngest.ts parseGithubRepo (pure) + fetchGithubSnapshot (never throws)
src/data/      Optional generated JSON
src/scene/     R3F components: Ground, Tombstone, Lantern, Zombie, Fog, Effects, CameraRig
src/ui/        HUD, side panel, ritual overlay, caption bar, repo loader
src/state/     zustand store (selected tombstone, ritual state, demo clock)
tests/         node:test files; tests/pbt for fast-check; tests/shims for tsc-only typings
scripts/       scan-repo.mjs, check-imports.mjs
docs/          DEMO_SCRIPT.md
.kiro/         steering, specs, hooks (committed on purpose, never gitignored)
```

## Dependency direction

`ui` and `scene` may import `core` and `state`. `state` may import `core`. `core` imports nothing outside `core`. Scene components receive data through props or the store and never run classification themselves.

## Where new work goes

- New classification rule: `analysis.ts`, a test in `tests/classify.test.ts`, and a line in `.kiro/specs/graveyard-generation/requirements.md`.
- New ritual behavior: `necromancer.ts` plus `.kiro/specs/resurrection-ritual/`.
- New demo shot: `demoScript.ts` plus `.kiro/specs/demo-mode/`.
