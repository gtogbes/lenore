# Devpost description: Lenore

**Category:** Costume Contest (Kiroween 2026). The costume is a haunted visualization of real engineering hygiene.

**Live demo:** https://gtogbes.github.io/lenore/ (requires Pages to be enabled; see CHECKLIST.md)
**Video:** [VIDEO URL]
**Code:** https://github.com/gtogbes/lenore (public, MIT)

**Tagline:** Lenore: a graveyard for your code. Here lies your codebase; the Necromancer wakes thee.

---

## Inspiration

Every team has files nobody dares touch, dependencies nobody upgrades and a "temporary" module that is now six years old. Linters list them in a table and we scroll past. We wanted dead code to feel like something: quiet, a little sad, and a little funny. A graveyard is the oldest way humans remember what is gone, so we built one out of a codebase.

The name comes from the lost maiden of Poe's "The Raven", called back from the dead the way forgotten files sometimes are. [YOUR STORY: why this idea, a real file you wanted to bury.]

## What it does

Lenore turns a repository into a night-time 3D graveyard you can walk around in your browser.

- **Tombstones** mark files untouched for 180+ days, marked `@deprecated`, or whose exports are all unused. Each carries an epitaph that quotes the real last commit, 80 characters at most. We never rewrite or mock the author.
- **Lanterns** glow on files with 5 or more commits in the last 90 days. The hotter the file, the warmer the light. A lantern is never also a tombstone.
- **Zombies** shamble through the outskirts: dependencies that are deprecated, a major version behind, or unreleased for two years.
- **Plots** are circular burial grounds, one per top-level directory.
- **Resurrection ritual:** click a tombstone and the Necromancer performs a 6 to 8 second ritual, then proposes to bury, revive or refactor the file, with a diff.
- **Demo mode** (press `D`) runs a hands-free tour of about 150 seconds.
- **Bring your own repo:** type `owner/name` for a public GitHub repo, or scan a local checkout with `scripts/scan-repo.mjs` and upload the JSON.

It works offline. The built-in `haunted-monolith` sample needs no repo, no network and no API key.

## How we built it

- **Stack:** Vite, React 18, TypeScript (strict), three.js with React Three Fiber, drei, postprocessing (bloom, vignette, noise only) and zustand.
- **A pure core.** All domain logic lives in `src/core` as dependency-free TypeScript: classification, epitaphs, layout, the Necromancer, the sample repo and the demo timeline. It never imports React or three, and a script enforces that in CI and in a hook.
- **Deterministic by design.** The only randomness is a seeded `mulberry32` PRNG. The same snapshot always produces the same graveyard, the same epitaphs and the same ritual, which makes everything testable.
- **Procedural everything.** Tombstones, zombies, bats, fog, stars and the ground shader are generated in code. The ambience is WebAudio, started after a user gesture. No copyrighted assets, no audio files.
- **Performance:** instanced meshes, a capped number of real point lights, and `prefers-reduced-motion` support.
- **Tested:** 34 `node:test` tests plus fast-check property tests (no overlapping markers, classification is total and deterministic, epitaphs stay in bounds). GitHub Actions runs install, tests and the full build before deploying to Pages.

## How Kiro was used

Kiro was the whole workflow, not a code-completion add-on.

- **Specs.** Three specs in `.kiro/specs/`: `graveyard-generation`, `resurrection-ritual` and `demo-mode`. Each has `requirements.md` with EARS acceptance criteria, `design.md` and `tasks.md`. The deterministic core suited spec-driven development perfectly, because each requirement became a test.
- **Steering.** Four docs in `.kiro/steering/`: `product` (the code-to-graveyard metaphor map and non-negotiables), `tech` (hard rules for the pure core), `structure` (dependency direction) and `style-haunting` (palette, lighting, tone, motion). They kept every agent turn on-theme and on-architecture. The tone rules are why the epitaphs stay kind.
- **Hooks.** Four hooks in `.kiro/hooks/`: run core tests and the core typecheck on save, check core purity on source edits, keep spec `tasks.md` in sync, and flag em dashes in Markdown.
- **Sub-agents.** In Kiro Web, an orchestrator delegated to a planner, a coder and a semantic reviewer. The reviewer ran three rounds before final approval. [YOUR STORY: what the reviewer caught that you would have missed.]
- **Powers.** The `github-cli` power handled the repo, the push, the pull requests and reading CI logs.
- **Vibe where it fits.** Colors, fog and motion were guided by the steering style guide rather than acceptance criteria.

## Challenges we ran into

- **No package registry in the authoring sandbox.** We could run the core tests and typecheck but not `npm install`, the Vite build or the 3D scene. We wrote the React Three code carefully and let CI be the first real build. It passed on the first run, which was a relief.
- **Keeping the scene cheap.** Hundreds of markers, lights and text labels fight a draw-call budget. Instancing, a light cap and labels only on the nearest tombstones solved it.
- **Honest ingestion.** The unauthenticated GitHub API has a 60 requests per hour limit, so ingestion never throws and falls back gracefully. Some rules, such as "no release in 2+ years", cannot be known from the registry data, and we say so instead of faking it.
- **Tone.** Making code death funny without being cruel to real people. Epitaphs only quote commits.

## Accomplishments that we're proud of

- The first 10 seconds show fog, lanterns and tombstones, with no setup.
- A fully deterministic, offline Necromancer that still feels alive.
- A pure core with a machine-checked boundary and property tests for its invariants.
- A first-ever CI build that passed: install, 34 of 34 tests, typecheck and Vite build.
- A real tool underneath the costume: the rules are genuine hygiene signals.

## What we learned

- Specs shine when the domain is deterministic; steering shines when the domain is taste.
- Hooks turn conventions into guardrails you stop thinking about.
- A reviewer agent that is separate from the coder finds different bugs than the coder's own tests do.
- [YOUR STORY: one personal lesson about working with Kiro.]

## What's next

- A pluggable real AI provider for the Necromancer through a `VITE_` key, with the offline mock as the default.
- Import-graph analysis for GitHub repos, so unused exports can be detected there too.
- Shareable graveyard snapshots and a time slider to watch a repo age.
- More monsters: ghosts for deleted files, crows for TODO comments.

## Built with

TypeScript, React, Vite, three.js, React Three Fiber, drei, postprocessing, zustand, WebAudio, Node.js `node:test`, fast-check, GitHub Actions, GitHub Pages, Kiro (specs, steering, hooks, sub-agents, powers).
