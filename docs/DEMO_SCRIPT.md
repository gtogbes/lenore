# Lenore demo video script (2:45)

Target length: 2:45, under the 3:00 limit. The in-app demo (press `D`) runs the timeline from `src/core/demoScript.ts`, which totals 148 seconds for the built-in sample (2:28). The last 17 seconds are a Kiro segment recorded separately or as an overlay.

Record at 1080p. Use no music, or music you made yourself or that is explicitly royalty free with a license you can show. The app has optional procedural ambience (`M`), which is safe to record.

## Shot list

Times are video time. Demo clock times match `buildDemoScript` for the sample graveyard; they shift if you load another repo.

| Video | Demo clock | Shot | Caption in app | Voiceover |
| --- | --- | --- | --- | --- |
| 0:00 to 0:10 | 0 to 10 | Wide establishing shot, fog, lanterns, tombstones | Welcome to Lenore: haunted-monolith, a codebase after dark. | "Every codebase has a graveyard. This is what yours looks like at night." |
| 0:10 to 0:20 | 10 to 20 | Orbit across plots | Every top-level folder is a plot. Every file is a resident. | "Each folder is a burial ground. Each file is a resident." |
| 0:20 to 0:32 | 20 to 32 | Close on the hottest lantern | Lanterns glow where the team commits most. Hot files, warm light. | "Files with five or more commits in 90 days become lanterns. The hotter, the warmer." |
| 0:32 to 0:44 | 32 to 44 | Low shot of a zombie in the outskirts | Stale or deprecated dependencies crawl the outskirts as zombies. | "Deprecated or outdated dependencies shamble in the fog as zombies." |
| 0:44 to 0:52 | 44 to 52 | Approach the oldest tombstone | Dead code gets a tombstone. (path and days silent) | "Code untouched for half a year gets a tombstone." |
| 0:52 to 0:58 | 52 to 58 | Highlight, epitaph readable | (the real last commit message) | "The epitaph quotes the real last commit. We never rewrite the author." |
| 0:58 to 1:22 | 58 to 82 | First resurrection ritual: violet glow, particles, side panel | Click a tombstone and the Necromancer begins the ritual. | "Click a tombstone and the Necromancer wakes it. Bury, revive or refactor." |
| 1:22 to 1:32 | 82 to 92 | Pull back, flicker, fog | The graveyard breathes. Lanterns flicker. Fog rolls in. | "Slow and eerie. Lanterns flicker, fog rolls in." |
| 1:32 to 1:40 | 92 to 100 | Approach the second tombstone | Another resident: (path), (days) days without a visit. | "Let us visit another resident." |
| 1:40 to 1:46 | 100 to 106 | Highlight, epitaph | (the real last commit message) | (silence, let the epitaph land) |
| 1:46 to 2:10 | 106 to 130 | Second ritual | A second ritual: bury it, revive it, or refactor it. All offline. | "The Necromancer is a deterministic offline mock. No API key, no network." |
| 2:10 to 2:20 | 130 to 140 | Wide shot from the far corner | No repo? No key? The sample graveyard needs neither. | "The sample needs nothing. Or load your own repo or a GitHub URL." |
| 2:20 to 2:28 | 140 to 148 | Final wide shot | Point Lenore at your own repo and see what has died. Happy Kiroween. | "Point it at your repo and see what has died. Happy Kiroween." |
| 2:28 to 2:45 | n/a | Screen recording of `.kiro/` in the editor: steering, three specs, four hooks | n/a | "Built with Kiro: steering files for tone and architecture, three specs with EARS criteria, hooks that run the tests and keep specs in sync, and property tests for the invariants." |

If you change `buildDemoScript`, rerun the sample, note the new timings and update this table.

## Recording tips

- Start the demo from a fresh page load so the first 10 seconds show fog, lanterns and tombstones.
- Leave the mouse still; moving the camera stops the demo.
- Turn sound on with `M` after a click so ambience can start.
- Upload to YouTube as **Public** and confirm the length is under 3:00.

## Submission checklist

- [ ] Public GitHub repository
- [ ] MIT `LICENSE` at the repo root, detected by GitHub (check the repo sidebar)
- [ ] `/.kiro` directory present at the root and **not** in `.gitignore` (steering, specs, hooks)
- [ ] `npm install && npm run build` passes on a networked machine (never run in the authoring sandbox)
- [ ] Live URL (GitHub Pages via `.github/workflows/deploy-pages.yml`) opens and shows the scene
- [ ] README has run instructions
- [ ] `KIRO_USAGE.md` TODO(human) items filled with real experience
- [ ] Public YouTube video under 3 minutes
- [ ] No copyrighted music or assets in the video
- [ ] Optional: blog post about the build
- [ ] Optional: social post with #KiroweenHackathon26
