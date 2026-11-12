# How Lenore used Kiro

Items marked **TODO(human)** need real, first-hand experience from the person who submits this project. They are left blank on purpose rather than invented.

## Honest context

The code and docs were produced by Kiro agents in a sandbox with no npm registry access, so the Vite build and the 3D scene could not be run there. The first real build ran on GitHub Actions (ubuntu, Node 22): `npm install`, `npm test` (34 of 34 passing) and `npm run build` (`tsc --noEmit` plus `vite build`) all succeeded. The only failing step was the Pages deploy, because Pages was not yet enabled in the repo settings. The scene has still not been checked by eye on a real GPU: TODO(human).

## IDE vs CLI vs Web vs Crew

| Surface | How it was used here |
| --- | --- |
| IDE | TODO(human): describe what you did in the Kiro IDE (specs, hooks panel, steering). |
| CLI | TODO(human): describe any `kiro-cli` sessions. |
| Web | The sandboxed, browser-based agent session that wrote the first implementation (core, scene, UI, docs, tests). It could run git, node and tsc but not npm installs. |
| Crew | An orchestrator delegated to a planner sub-agent, a coder sub-agent and a semantic reviewer. The planner wrote the task plan and three features (core and .kiro files, scene and UI, docs), the coder implemented them, and the reviewer ran three review rounds before final approval. TODO(human): say how well this worked for you. |

TODO(human): add your honest comparison of the four surfaces: what each was good and bad at.

## Custom agents

No custom agent definition files are committed in this repo. The orchestrator and sub-agent split described above came from the hosting environment, and the task plan lives in `.agents/tasks/task-necropolis/`. TODO(human): if you define a custom agent (for example a "Necromancer reviewer"), commit it and describe it here.

## Agent hooks

Four hooks are committed in `.kiro/hooks/`:

| File | Trigger | Action |
| --- | --- | --- |
| `core-tests-on-save.kiro.hook` | Edit of `src/core/**/*.ts` | Runs the node tests and `tsc -p tsconfig.core.json --noEmit` |
| `check-core-purity.kiro.hook` | Edit of `src/**/*.ts`, `src/**/*.tsx`, `tests/**/*.ts` | Runs `node scripts/check-imports.mjs` |
| `no-em-dashes.kiro.hook` | Edit of any `*.md` | Asks the agent to replace em dashes, per the style guide |
| `update-spec-tasks.kiro.hook` | Edit of `src/**/*.ts` or `.tsx` | Asks the agent to tick or add checkboxes in the matching spec `tasks.md` |

TODO(human): note which hooks fired in practice and which were annoying or useful.

## Spec-driven vs vibe coding

Three specs live in `.kiro/specs/`, each with `requirements.md` (EARS acceptance criteria), `design.md` and `tasks.md`:

- `graveyard-generation`: classification, epitaphs, layout, sample repo, GitHub ingest, scene placement.
- `resurrection-ritual`: Necromancer interface, mock, ritual state machine and visuals.
- `demo-mode`: the 150 second scripted tour.

The deterministic core (classification, layout, epitaph bounds, demo timeline) suited specs well because the requirements translate directly into tests. The visual parts (colors, fog, motion) were closer to vibe coding, guided by the steering style guide rather than by acceptance criteria. TODO(human): add your own account of where each approach helped or hurt.

Open items in the specs: the optional real provider wrapper (`resurrection-ritual`). The demo narration doc item is done by `docs/DEMO_SCRIPT.md`.

## Steering docs

`.kiro/steering/` holds four files that every agent turn follows:

- `product.md`: the code-to-graveyard metaphor map and non-negotiables.
- `tech.md`: stack, hard rules for `src/core` (pure TS, seeded PRNG only, `.ts` import extensions), commands, testing conventions, performance budget.
- `structure.md`: folder layout and dependency direction.
- `style-haunting.md`: palette, lighting, tone of voice, motion, and the no-em-dash rule.

The steering did real work: it kept `src/core` free of React and Three, and it kept randomness seeded so tests stay deterministic.

## MCP

No MCP server is active. An **example, disabled** config for a git-history server is in `docs/mcp.example.json` (the authoring environment blocked writes to `.kiro/settings/mcp.json`, so copy it there yourself to use it). It could let an agent query commit history directly when tuning the classifier. The package name in it is a placeholder to verify before enabling. TODO(human): if you enable an MCP server, describe what it enabled.

## Property-based testing

`tests/pbt/properties.test.ts` uses fast-check through a dynamic `import("fast-check")` in a try/catch, and skips when the package is absent. Three properties are covered: layout never overlaps markers, classify is total and deterministic, and epitaphs never exceed the length bound. fast-check could not be installed in the authoring sandbox, so it was added to `devDependencies` afterwards so that CI can run these properties. TODO(human): run `npm run test:pbt` after `npm install` and record any counterexamples found.

## Kiro powers

Powers available in the authoring environment included `github-cli` (git and PR work), `playwright` and `agent-browser` (browser automation, which could screenshot the scene once it runs), and `gitlab-cli`. None are required by the project. The `github-cli` power was used for the repository, the push, pull requests and reading CI logs. TODO(human): say whether you used any other power.
