# Lenore: tech steering

## Stack

Vite + React 18 + TypeScript (strict) + three + @react-three/fiber + @react-three/drei + @react-three/postprocessing + zustand.

## Hard rules for `src/core`

- Pure TypeScript only. No imports of `react`, `three` or `@react-three/*` (enforced by `scripts/check-imports.mjs`).
- Relative imports must carry explicit `.ts` extensions so files run under `node --experimental-strip-types`.
- Avoid syntax that type stripping cannot erase: no `enum`, no `namespace`, no constructor parameter properties. Use string unions and plain fields.
- Randomness comes only from `mulberry32` in `src/core/prng.ts`. Never call `Math.random()` or `Date.now()` in core; take a `now: Date` argument instead.
- Same input must give the same output: classification, epitaphs, layout and rituals are all deterministic.

## Commands

- `npm run dev`: Vite on port 5173.
- `npm run build`: `tsc --noEmit && vite build`.
- `npm test`: `node --experimental-strip-types --test tests/*.test.ts`.
- `npm run test:pbt`: property-based tests in `tests/pbt/` (skip gracefully when fast-check is missing).
- `tsc -p tsconfig.core.json --noEmit`: typechecks core and tests without React or Three.
- `node scripts/scan-repo.mjs <dir> <out.json>`: snapshot a local git repo.

## Testing conventions

- `node:test` and `node:assert/strict`. One test file per core module in `tests/`.
- Property tests use dynamic `import("fast-check")` in try/catch and pass `{ skip }` when absent.
- Add a property test whenever a new invariant is introduced (no overlaps, bounded length, determinism).

## Performance budget for the scene

Instance repeated meshes, keep draw calls low, cap postprocessing to bloom + vignette + noise, and honor `prefers-reduced-motion`.
