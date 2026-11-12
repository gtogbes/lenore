# Graveyard generation: design

## Data flow

```
RepoSnapshot (sample | scan-repo.mjs JSON | githubIngest)
   -> classify(snapshot, now)        src/core/analysis.ts
   -> Graveyard {tombstones, lanterns, zombies}
   -> layoutGraveyard(graveyard, seed) src/core/layout.ts
   -> GraveyardLayout {plots, tombstones[], lanterns[], zombies[], paths}
   -> scene components (src/scene) render placements
```

## Key decisions

- **Pure core.** No React, Three or clock access. `now` is a parameter, which makes every rule testable.
- **Thresholds as exported constants** (`STALE_DAYS`, `LANTERN_MIN_COMMITS`, `ABANDONED_DAYS`) so tests and docs agree.
- **Layout guarantee by construction.** Each plot places markers on a jittered grid (cell 1.5x the minimum distance, jitter 0.2x), so the minimum distance holds without rejection sampling. Plot radius covers the farthest cell plus half the minimum distance, and plots are spaced by at least the sum of radii plus the minimum distance, which also protects cross-plot spacing.
- **Plot placement** walks an outward golden-angle spiral per directory until the circle fits.
- **Determinism.** Seeds derive from `hashString(dir or id) xor seed` through `mulberry32`.
- **Epitaphs** clip the commit subject to fit the 80 character budget after opener, author and year.
- **Ingest split.** `parseGithubRepo` is pure; `fetchGithubSnapshot` takes an injected fetcher and maps 403/429 to a `RateLimitError`, returned as `{ ok: false, rateLimited: true }`. A 403 counts as a rate limit only when `x-ratelimit-remaining` is `0` or absent. `package.json` and npm `/latest` lookups are best effort and never fail the load.

## Correctness properties (PBT in tests/pbt)

- No two markers closer than `MIN_MARKER_DISTANCE` for random snapshots.
- `classify` is deterministic and never yields a path that is both tombstone and lantern.
- Epitaph length never exceeds 80.
