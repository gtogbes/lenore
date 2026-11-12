# Submission checklist: Kiroween 2026, Costume Contest

Status key: DONE, PENDING (needs you), N/A.

## Deadlines (Pacific Time)

| Date | Item | Status |
| --- | --- | --- |
| Dec 1, 12:00 pm PT | Last time to request Kiro credits | PENDING (only if you need them) |
| Dec 4 | Redeem credits by this day | PENDING (only if requested) |
| Dec 4, 2:00 pm PT | Submit on Devpost. Submit early, do not wait for the last hour. | PENDING |

## Required by the rules

| Requirement | Status | Notes |
| --- | --- | --- |
| Category chosen: Costume Contest | DONE | Stated in README and `submission/DEVPOST_DESCRIPTION.md` |
| Public GitHub repo | DONE | https://github.com/gtogbes/lenore |
| Open source license detected by GitHub | PENDING (verify) | MIT `LICENSE` is committed. Check the repo sidebar shows MIT. |
| `/.kiro` at the root, not gitignored | DONE | Steering, specs, hooks are committed. Verify on GitHub. |
| Working project that builds | DONE | CI on main ran `npm install`, `npm test` (34 of 34) and `npm run build` successfully. |
| Live demo URL | PENDING | Enable Pages: Settings, Pages, Source: GitHub Actions, then rerun the workflow. Expected URL: https://gtogbes.github.io/lenore/ . Open it and confirm the scene renders. |
| README with run instructions | DONE | Quick start in README.md |
| Text description (Devpost story) | PENDING | Draft in `submission/DEVPOST_DESCRIPTION.md`. Fill `[YOUR STORY: ...]` slots and the video URL. |
| Demo video under 3 minutes on YouTube | PENDING | Script in `submission/VIDEO_SCRIPT.md`. Public, under 3:00, no copyrighted music. |
| Video shows the project working | PENDING | Include the live ritual and a real GitHub repo load. |
| Kiro usage explained | PENDING | `KIRO_USAGE.md` has factual parts filled. Fill the `TODO(human)` opinions. |
| Only original work, no copyrighted assets | DONE | Everything is procedural, no audio files. |
| Project created during the hackathon period | PENDING (verify) | Check the first commit date is inside the contest window. |

## Judging criteria (equally weighted): where each is addressed

| Criterion | Where |
| --- | --- |
| Potential Impact | Story: who it is for, why dead code matters. Video 0:10 to 0:30. |
| Technological Implementation (Kiro depth) | Specs, steering, hooks, sub-agents, powers, pure core, property tests. Video 2:05 to 2:35. `KIRO_USAGE.md`. |
| Design | Fog, lanterns, palette in the first 10 seconds. Style guide in `.kiro/steering/style-haunting.md`. |
| Innovation | Metaphor map from code signals to graveyard objects. |
| Presentation | Problem, audience, why it matters, end-to-end demo in the video. |

## Bonus prizes

| Prize | Requirement | Status |
| --- | --- | --- |
| Blog Post | Publish on dev.to or similar. It must say it was written as part of the Kiroween 2026 hackathon. Use the right tags and submit the link on Devpost. | PENDING. Draft in `submission/BLOG_POST.md`. Fill `[YOUR STORY: ...]`, set `published: true`, add a cover image. |
| Social Blitz | Post that STARTS with `#KiroweenHackathon26`, sharing your favorite thing about Kiro and how it changed your approach. Judged on original thoughts, not AI writing. | PENDING. Drafts in `submission/SOCIAL_POSTS.md`. Fill every `[YOUR WORDS: ...]` slot yourself. |
| Best Demo | Strong demo video, clear walkthrough. | PENDING, depends on the video. |
| Ghost of Kiroween Past | Only if you registered or took part in 2025. Check the rules for the exact eligibility and what to submit. | N/A unless you took part in 2025. Fill in if applicable. |

## Before you press submit

- [ ] Enable GitHub Pages and confirm the live URL loads and the first 10 seconds look right.
- [ ] Merge this branch (adds `fast-check` so property tests run in CI) and confirm CI is green.
- [ ] Fill every `[YOUR STORY: ...]`, `[YOUR WORDS: ...]` and `TODO(human)` marker. Search for them: `grep -rn "YOUR \|TODO(human)" .`
- [ ] Record, upload and verify the YouTube video (Public, under 3:00).
- [ ] Add the live URL and the video URL to Devpost, README and the drafts.
- [ ] Publish the blog post and post the social message.
- [ ] Open the Devpost submission as a logged-out user and check links work.
- [ ] Submit before Dec 4, 2:00 pm PT.
