# Resurrection ritual: design

## Interfaces

```ts
interface Necromancer {
  readonly name: string;
  resurrect(tombstone: Tombstone): Promise<RitualPlan>;
}
```

`MockNecromancer` wraps the pure `planRitual(tombstone)`. Randomness is seeded by `hashString(tombstone.id + lastCommit.sha)`, so plans are stable across runs.

## Verdict rules

- unused exports and 365+ days stale: `bury`
- deprecated: `refactor` or `bury` (seeded coin flip)
- only unused exports: `bury`
- otherwise stale: `revive` or `refactor` (seeded coin flip)

## State machine (zustand store)

`idle -> summoning (plan requested) -> chanting (steps play, about 1 second each) -> risen (plan shown) -> idle`

The store holds `selectedId`, `ritual: {phase, plan, stepIndex}`. The scene reads `phase` to drive glow, rising particles and camera push-in. The UI reads `plan` and `stepIndex` for the overlay.

## Provider plug-in

`createNecromancer()` returns the mock today. A real provider reads `import.meta.env.VITE_NECROMANCER_KEY` in the UI layer (not core), wraps the mock, and falls back to it on any error.

## Safety

The ritual only produces text. Nothing writes to the analyzed repo.
