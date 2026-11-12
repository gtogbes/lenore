# Graveyard generation: tasks

- [x] Define domain types in `src/core/types.ts`
- [x] Implement mulberry32 and hashString in `src/core/prng.ts`
- [x] Implement `classify` with tombstone, lantern and zombie rules
- [x] Implement `makeEpitaph` with the 80 character bound
- [x] Implement `layoutGraveyard` with plots, minimum distance and zombie paths
- [x] Build the `haunted-monolith` sample (about 60 files, 14 deps)
- [x] Implement `parseGithubRepo` and `fetchGithubSnapshot` with rate-limit handling
- [x] Fetch `package.json` and npm registry data so real repos can have zombies
- [x] Write `scripts/scan-repo.mjs` for local repos
- [x] Unit tests: classification, epitaph, layout, sample, ingest
- [x] Property tests with graceful fast-check skip
- [x] Render placements in R3F (`src/scene`), instanced where possible
- [x] Repo loader UI: sample, uploaded JSON, GitHub owner/name
