# Lenore: product steering

Lenore turns a codebase into a living, night-time 3D graveyard. It is an entry for the Kiroween 2026 Costume Contest, so the "costume" is a haunted visualization of real engineering hygiene.

## Metaphor map (do not drift from this)

| Code signal | Graveyard object | Rule |
| --- | --- | --- |
| File untouched 180+ days, `@deprecated` marker, or every export unused | Tombstone | `classify()` in `src/core/analysis.ts` |
| File with 5+ commits in the last 90 days | Lantern, heat 0..1 | Never also a tombstone |
| Dependency deprecated, 1+ major behind, or no release in 2+ years | Zombie crawling in the outskirts | Wanders on a seeded path |
| Top-level directory | A plot (circular burial ground) | One per directory |
| Last commit message + author + year | Epitaph on the tombstone, max 80 chars | `makeEpitaph()` |
| Clicking a tombstone | Resurrection ritual | Offline mock Necromancer proposes bury, revive or refactor |

## Non-negotiables

1. The built-in `haunted-monolith` sample must work with no repo, no network and no API key.
2. The Necromancer is a deterministic offline mock by default. A real provider is optional and pluggable through a `VITE_` env key; the app must never break when it is absent.
3. A scripted demo mode runs about 150 seconds so judges can watch without touching anything.
4. Everything is procedural: no copyrighted assets, no audio files (WebAudio ambience starts only after a user gesture).
5. Tone is playful and a little spooky, never mean about real people. Epitaphs quote commit messages; do not invent insults.

## Audience

Judges and developers skimming a demo video. The first 10 seconds must show fog, lanterns and tombstones.
