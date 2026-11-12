---
title: "Lenore: I turned a codebase into a haunted graveyard with Kiro"
published: false
description: "A 3D night-time graveyard where dead files get tombstones, hot files get lanterns and stale dependencies shamble as zombies. Built with Kiro for Kiroween 2026."
tags: kiro, kiroween, threejs, webdev
cover_image: [COVER IMAGE URL]
---

*This post was written as part of the Kiroween 2026 hackathon, for the Costume Contest category.*

Live demo: https://gtogbes.github.io/lenore/
Code: https://github.com/gtogbes/lenore
Video: [VIDEO URL]

## The idea

Every codebase has a graveyard. Files nobody touches, a `utils2.ts` with a `@deprecated` tag from three years ago, a dependency that has been a major version behind since the pandemic. Tools list these in tables. We scroll past tables.

So I built Lenore, which turns a repo into a living 3D graveyard at night. [YOUR STORY: the file or project that made you want to build this.]

The name comes from the lost maiden of Poe's "The Raven", called back from the dead the way a forgotten file sometimes is.

## The metaphor map

The rule I held myself to: every visual has to be a real signal.

| Code signal | Graveyard object |
| --- | --- |
| Untouched 180+ days, `@deprecated`, or all exports unused | Tombstone |
| 5+ commits in the last 90 days | Lantern, warmer with heat |
| Deprecated, major-behind or stale dependency | Zombie in the outskirts |
| Top-level directory | A circular plot |
| Last commit message, author, year | Epitaph, 80 characters max |
| Click a tombstone | Resurrection ritual |

The epitaph quotes the real last commit. It never rewrites the author. Funny, never cruel.

## The Necromancer

Click a tombstone and a violet ritual plays for six to eight seconds, then the Necromancer proposes to bury, revive or refactor the file and shows a diff. It is a deterministic offline mock, so there is no key and no network, and the same file always gets the same verdict. A real model provider can plug in later behind a `VITE_` env key.

## Architecture: a pure core

Everything that decides anything lives in `src/core`, plain TypeScript with no React and no three.js. Randomness comes only from a seeded `mulberry32`. That gave me:

- tests that run with `node --experimental-strip-types --test`, with no bundler,
- property tests with fast-check (no overlapping markers, classification is total and deterministic, epitaphs stay in bounds),
- a scene layer that only draws what the core hands it.

A small script fails the build if core imports React or three.

## How Kiro shaped the build

**Steering.** Four files: product (the metaphor map), tech (the core rules), structure (dependency direction) and a haunting style guide with palette, lighting, tone and motion. Every agent turn followed them. The style guide is why lanterns lerp from `#ffb347` to `#ff7a1a` and why nothing in the repo is mean.

**Specs.** Three specs with EARS requirements: graveyard generation, the resurrection ritual and demo mode. For the deterministic parts, a requirement turned directly into a test.

**Hooks.** Run the core tests on save, check core purity, keep spec task lists in sync, and flag em dashes in Markdown.

**Sub-agents.** In Kiro Web an orchestrator delegated to a planner, a coder and a semantic reviewer. The reviewer went three rounds before approving. [YOUR STORY: a concrete thing the reviewer pushed back on.]

**Powers.** The `github-cli` power handled the repo, the push, pull requests and reading CI logs.

## The part where it could not build

My authoring sandbox had no npm registry access. I could run the core tests and typecheck, but never `npm install`, the Vite build or the 3D scene. The React Three code was written blind. I let GitHub Actions be the first real build.

It passed on the first run: install, 34 of 34 tests, `tsc --noEmit` and `vite build`. [YOUR STORY: how it felt to watch that run.] The only failure was the deploy step, because I had not yet enabled Pages in the repo settings.

## Keeping it cheap

Instanced meshes, a cap on real point lights, text labels only on the nearest tombstones, and only bloom, vignette and noise in postprocessing. Fog hides the horizon so the world feels endless. `prefers-reduced-motion` shortens camera moves and turns off flicker.

## What I learned

- Specs for deterministic logic, steering for taste.
- Hooks make conventions stop being a thing you remember.
- A separate reviewer finds different bugs than the coder's tests.
- [YOUR STORY: your own takeaway.]

## Try it

Open the live demo and press `D` for a hands-free 150 second tour, or click a tombstone yourself. Load your own public repo with `owner/name`. Then see what has died.

Happy Kiroween.
