# Lenore

> Lenore: a graveyard for your code. Here lies your codebase; the Necromancer wakes thee.

*Named for the lost maiden of Poe's "The Raven", called back from the dead like your forgotten files.*

Lenore turns a codebase into a living, night-time 3D graveyard. Dead code becomes tombstones, hot files become glowing lanterns, and stale dependencies shamble through the fog as zombies. Click a tombstone and an offline Necromancer performs a resurrection ritual that proposes to bury, revive or refactor the file.

Entry for the **Kiroween 2026 Costume Contest**. The costume is a haunted visualization of real engineering hygiene.

<!-- TODO(human): add a screenshot or GIF here once the scene has run on a real GPU. -->
(Screenshot placeholder.)

## Honest status

The sandbox this project was written in had **no npm registry access** (HTTP 403). So:

| Command | Verified in the sandbox? |
| --- | --- |
| `npm test` equivalent: `node --experimental-strip-types --test tests/*.test.ts` (26 core tests) | Yes, passing |
| `tsc -p tsconfig.core.json --noEmit` (core and tests only) | Yes, passing |
| `node scripts/check-imports.mjs` (import resolution and core purity) | Yes, passing |
| `npm install` | No |
| `npm run build` (`tsc --noEmit && vite build`) | **No, never run** |
| `npm run dev` and the 3D scene | **No, never run** |
| `npm run test:pbt` (needs fast-check) | No, never run with fast-check installed |

The React and Three.js code under `src/scene`, `src/ui` and `src/state` was written carefully but has not been compiled or rendered. Expect to fix a few type or runtime errors on the first `npm install && npm run build` on a machine with network access.

## Features

- **Tombstones**: files untouched for 180+ days, marked `@deprecated`, or with every export unused. Each carries an epitaph quoting the real last commit (80 characters max).
- **Lanterns**: files with 5+ commits in the last 90 days. Warmer and brighter with heat. Never also a tombstone.
- **Zombies**: dependencies that are deprecated, a major version behind, or unreleased for 2+ years. They wander the outskirts on seeded paths.
- **Plots**: one circular burial ground per top-level directory.
- **Resurrection ritual**: click a tombstone. A deterministic mock Necromancer plans a 6 to 8 second ritual and proposes bury, revive or refactor.
- **Demo mode**: a hands-free tour of about 150 seconds (press `D`).
- **Offline by default**: the built-in `haunted-monolith` sample needs no repo, no network and no API key.
- **Procedural everything**: no copyrighted assets and no audio files. Optional WebAudio ambience starts only after a user gesture (`M` toggles it).
- Honors `prefers-reduced-motion`.

## Quick start

Requires Node 22 or newer.

```
npm install
npm run dev      # Vite on http://localhost:5173
npm run build    # tsc --noEmit && vite build
npm test         # core tests, no dependencies needed
npm run test:pbt # property-based tests (skip if fast-check is missing)
```

The first 10 seconds show fog, lanterns and tombstones from the sample graveyard.

### Scan a local repo

```
node scripts/scan-repo.mjs /path/to/some/repo snapshot.json
```

Then open the app, choose **Load repo**, then **Upload snapshot JSON**. The script reads `git ls-files` and `git log`, so the target must be a git checkout. It also asks the npm registry for each dependency's latest version and deprecation flag; pass `--offline` to skip that (no zombies then).

### Load from GitHub

Choose **Load repo** and enter `owner/name` or a `github.com` URL. This uses the unauthenticated GitHub REST API from the browser, so it works for public repos only and is subject to the 60 requests per hour rate limit per IP. When the limit is hit, the loader shows a friendly message and you can fall back to the sample or a scanned snapshot. Ingestion never throws and never breaks the scene. GitHub mode has no import graph, so export usage is not known there.

One load costs up to 42 GitHub requests (1 tree, 1 `package.json`, and one commits request for each of the 40 largest code files), so a single load uses most of the hourly quota. A 403 is reported as a rate limit only when `x-ratelimit-remaining` is 0; other 403s and 404s get their own messages. Dependencies are looked up on the npm registry (`/<name>/latest`, up to 40, outside the GitHub quota) for the latest version and deprecation flag, so ingested repos can show zombies for deprecated or major-behind packages. The registry document has no publish date, so the "no release in 2+ years" rule only applies to the built-in sample and to snapshots that supply `lastRelease` themselves.

### Demo mode

Press **Demo** (or `D`) for a scripted tour of about 150 seconds. `Escape` or moving the camera hands control back. The shot list lives in `src/core/demoScript.ts` and the video script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

### Optional real AI provider

The Necromancer is an offline deterministic mock. A pluggable real provider through a `VITE_` env key is planned but **not implemented yet**; see the unchecked item in `.kiro/specs/resurrection-ritual/tasks.md`. The app never needs a key.

## Deploy

`.github/workflows/deploy-pages.yml` builds the app and publishes `dist` to GitHub Pages. It sets `BASE_PATH=/<repo>/` so assets resolve under the project page URL. Enable Pages with source "GitHub Actions" in the repository settings. The workflow has not been run yet.

## Project structure

```
src/core/    Pure TypeScript domain logic (no React or Three)
src/scene/   React Three Fiber components
src/ui/      HUD, panels, caption bar, repo loader
src/state/   zustand store
src/audio/   Procedural WebAudio ambience
tests/       node:test files; tests/pbt for fast-check
scripts/     scan-repo.mjs, check-imports.mjs
docs/        DEMO_SCRIPT.md
.kiro/       steering, specs, hooks (committed on purpose)
```

`core` imports nothing outside `core`; `scripts/check-imports.mjs` enforces that. See [KIRO_USAGE.md](KIRO_USAGE.md) for how Kiro was used.

## License

MIT. See [LICENSE](LICENSE).
