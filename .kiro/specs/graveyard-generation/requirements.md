# Graveyard generation: requirements

Turns a `RepoSnapshot` into a `Graveyard` and a deterministic 2D layout.

## User stories

1. As a developer, I want dead code shown as tombstones so I can see what to delete.
2. As a developer, I want hot files shown as lanterns so I can see where the team works.
3. As a developer, I want stale dependencies shown as zombies so I can see upgrade debt.

## Acceptance criteria (EARS)

1. WHEN a file's last commit is 180 or more days before `now`, THE system SHALL classify it as a tombstone with reason `stale`.
2. WHEN a file carries a deprecation marker, THE system SHALL classify it as a tombstone with reason `deprecated`.
3. WHEN a file has at least one export and every export has `usedBy` equal to 0, THE system SHALL classify it as a tombstone with reason `unused-exports`.
4. WHEN a file is not a tombstone and has 5 or more commits in the last 90 days, THE system SHALL classify it as a lantern with heat between 0 and 1.
5. THE system SHALL NOT classify any file as both a tombstone and a lantern.
6. WHEN a dependency is deprecated, one or more major versions behind, or unreleased for 730 or more days, THE system SHALL classify it as a zombie with the matching reasons.
7. THE system SHALL produce an epitaph of at most 80 characters from the last commit message, author and year.
8. WHEN the same snapshot, `now` and seed are given, THE system SHALL return identical classification and layout.
9. THE layout SHALL contain one plot per top-level directory that has markers, and plots SHALL NOT overlap.
10. THE layout SHALL keep every pair of tombstones and lanterns at least `MIN_MARKER_DISTANCE` apart.
11. WHEN the built-in `haunted-monolith` sample is classified, THE system SHALL yield at least 8 tombstones, 5 lanterns and 3 zombies.
12. IF the GitHub API reports a rate limit, THEN THE ingest SHALL return a typed error result and SHALL NOT throw.
13. IF the GitHub API answers 403 while `x-ratelimit-remaining` is above 0, THEN THE ingest SHALL report a refusal, not a rate limit.
14. WHEN a repo has a root `package.json` and the npm registry is reachable, THE ingest SHALL fill each dependency's `latest` and `deprecated` from the registry so zombies can appear for real repos.
15. THE layout SHALL keep every zombie wander loop inside the band from 1.5 to 7.5 units beyond the outermost plot, inside the fence.
16. THE loader SHALL reject a snapshot whose `exports` or `deps` entries are malformed before classification, and SHALL report the real cause of any later failure.
17. THE fetch ingest SHALL take `now` as a required argument and SHALL NOT read the clock.
