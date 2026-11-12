# Lenore video script (target 2:45, hard limit 3:00)

Source of truth for the in-app timeline: `src/core/demoScript.ts` (148 s, press `D`) and `docs/DEMO_SCRIPT.md`. This script keeps the same shots but trims the second ritual and adds two segments the in-app demo does not have: loading a real GitHub repo and the Kiro segment. Cut the extra footage in your editor; do not speed the app up.

## Structure at a glance

| Video time | Segment | Source footage |
| --- | --- | --- |
| 0:00 to 0:10 | Hook: fog, lanterns, tombstones | Demo clock 0 to 10 |
| 0:10 to 0:30 | Problem and who it is for | Demo clock 10 to 20, then 20 to 30 (lantern) |
| 0:30 to 0:40 | Zombies | Demo clock 32 to 42 |
| 0:40 to 0:52 | Tombstone and epitaph | Demo clock 44 to 58 |
| 0:52 to 1:20 | Live resurrection ritual | Demo clock 58 to 82, trim the tail |
| 1:20 to 1:50 | Load a real GitHub repo | Live screen capture, not in the demo |
| 1:50 to 2:05 | Offline, no key, why it matters | Demo clock 130 to 140 |
| 2:05 to 2:35 | Built with Kiro | Screen capture of `.kiro/` and the agent session |
| 2:35 to 2:45 | Close | Demo clock 140 to 148 |

## Timed voiceover and shots

**0:00 to 0:10, hook.** Fresh page load, intro fly-in. Fog, glowing lanterns, tombstones in view from frame one. No title card.
> "Every codebase has a graveyard. This is what yours looks like at night."

**0:10 to 0:20, problem.** Orbit across the plots.
> "Dead files, forgotten code and stale dependencies pile up, and nobody sees them. Lists of warnings get ignored. A graveyard does not."

**0:20 to 0:30, who it is for.** Close on the hottest lantern.
> "Lenore is for any team that inherits code: new hires, maintainers, tech leads doing a cleanup. Each folder is a burial ground. Files with five or more commits in ninety days become lanterns. The hotter, the warmer."

**0:30 to 0:40, zombies.** Low shot of a zombie in the fog.
> "Deprecated or outdated dependencies shamble through the outskirts as zombies."

**0:40 to 0:52, tombstone.** Approach the oldest tombstone, hold on the epitaph.
> "Code untouched for half a year gets a tombstone. The epitaph quotes the real last commit. We never rewrite the author."

**0:52 to 1:20, ritual.** Click the tombstone. Violet glow, particles, side panel typewriter text. Let the ritual run its 6 to 8 seconds uncut, then show the verdict.
> "Click a tombstone and the Necromancer wakes it. Bury it, revive it, or refactor it. It proposes a plan and shows the diff, and you decide."

**1:20 to 1:50, real repo.** Open Load repo, type a small public `owner/name` (rehearse first; pick one under the GitHub rate limit). Show loading, then the new graveyard fading in. Mention that it needs no token.
> "This is not just a demo. Paste any public GitHub repo and Lenore builds its graveyard from the real tree and the real commit history. Same rules, same epitaphs, new bones."

Fallback if the API is rate limited: record this segment ahead of time and keep the footage. Show the friendly rate limit message only if you want to mention it; do not hide it in the repo.

**1:50 to 2:05, offline.** Wide shot from the far corner.
> "The Necromancer is a deterministic offline mock. No API key, no network. The built-in sample works anywhere, and the same input always gives the same graveyard."

**2:05 to 2:35, Kiro.** Screen capture, about 5 to 6 seconds each: the `.kiro/steering` folder, a spec's `requirements.md` with EARS criteria, the hooks list, then the agent session showing the orchestrator and sub-agents.
> "Lenore was built with Kiro. Four steering files set the tone and keep the core pure. Three specs turn requirements into tests. Four hooks run the tests, check imports and keep the specs in sync. An orchestrator delegated to a planner, a coder and a reviewer, and the reviewer sent work back twice before approving it. [YOUR STORY: one sentence on the moment Kiro surprised you.]"

**2:35 to 2:45, close.** Final wide shot.
> "Point Lenore at your repo and see what has died. Happy Kiroween."

Word budget: about 330 spoken words at a calm 135 words per minute is about 2:25, which leaves breathing room for the ritual and the epitaph. Read it aloud once with a timer.

## Judging criteria coverage

- Problem, who it is for, why it matters: 0:10 to 0:30.
- End-to-end demo: tombstone, ritual, real repo load.
- Design: fog, lanterns, palette are on screen in the first 10 seconds.
- Technological implementation and Kiro depth: 2:05 to 2:35.
- Innovation: the metaphor map (code signal to graveyard object).

## Recording tips

- 1080p, 30 or 60 fps, browser in fullscreen (F11), page zoom 100 percent, hide bookmarks and extensions.
- OBS Studio or any screen recorder. Record on a real GPU; software WebGL will stutter.
- Start the demo from a fresh page load so the opening 10 seconds are fog, lanterns and tombstones. Leave the mouse still, because moving the camera ends demo mode. Press `Esc` only when you want control back.
- Click once on the page, then press `M` for the procedural WebAudio ambience. It is generated in code, so it is safe to record. Add no other music. If you want music anyway, use only something you made or a track with a license you can show.
- Record voiceover separately in a quiet room, then lay it over the footage. Keep captions on; the in-app caption bar carries the story if sound is off.
- Export under 3:00, upload to YouTube as Public (not Unlisted, not Private), and check that the length shows under 3:00 before submitting.
- Do not show API keys, tokens or private repos on screen.
