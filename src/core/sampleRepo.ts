import type { CommitInfo, Dependency, FileInfo, RepoSnapshot } from "./types.ts";
import { mulberry32, pick, randInt } from "./prng.ts";

/** Fixed reference date so the sample graveyard looks identical on every run. */
export const SAMPLE_NOW = new Date("2026-10-31T00:00:00Z");
const DAY_MS = 86_400_000;

const AUTHORS = ["Mortimer Vale", "Edda Grimsby", "Ravi Nightingale", "Cass Holloway", "Ingrid Ashdown", "Tobias Crow"];

const FRESH_MESSAGES = [
  "fix flaky retry in queue worker",
  "add pagination to invoice list",
  "tighten types around session store",
  "speed up search index rebuild",
  "handle empty cart on checkout",
  "log request ids in api gateway",
];

const OLD_MESSAGES = [
  "quick hack, will clean up later",
  "TODO: remove after migration",
  "works on my machine",
  "temporary workaround for IE11",
  "final fix, really this time",
  "copy paste from the old billing service",
  "wip: do not merge",
  "revert revert of revert",
];

type Profile = "stale" | "deprecated" | "unused" | "hot" | "warm";

interface Spec {
  path: string;
  profile: Profile;
}

// Fixed file list with forced profiles, so category counts are guaranteed.
const SPECS: Spec[] = [
  // api
  ...["users", "orders", "billing", "search", "sessions", "webhooks"].map((n, i): Spec => ({
    path: `src/api/${n}.ts`,
    profile: (["hot", "hot", "stale", "hot", "warm", "unused"] as Profile[])[i] as Profile,
  })),
  { path: "src/api/legacySoap.ts", profile: "deprecated" },
  { path: "src/api/index.ts", profile: "warm" },
  // ui
  ...["Header", "Footer", "Cart", "Checkout", "Modal", "Toast", "Sidebar", "Table"].map((n, i): Spec => ({
    path: `src/ui/${n}.tsx`,
    profile: (["warm", "warm", "hot", "hot", "stale", "warm", "unused", "warm"] as Profile[])[i] as Profile,
  })),
  { path: "src/ui/OldCarousel.tsx", profile: "deprecated" },
  { path: "src/ui/jqueryShim.ts", profile: "stale" },
  // core
  ...["pricing", "tax", "inventory", "notifications", "scheduler", "auth", "feature-flags"].map((n, i): Spec => ({
    path: `src/core/${n}.ts`,
    profile: (["hot", "warm", "warm", "stale", "warm", "hot", "unused"] as Profile[])[i] as Profile,
  })),
  { path: "src/core/v1Compat.ts", profile: "deprecated" },
  // utils
  ...["date", "string", "money", "array", "debounce", "uuid", "cache", "retry"].map((n, i): Spec => ({
    path: `src/utils/${n}.ts`,
    profile: (["warm", "warm", "warm", "stale", "unused", "warm", "stale", "warm"] as Profile[])[i] as Profile,
  })),
  // db
  ...["connection", "migrations", "seed", "models", "queries"].map((n, i): Spec => ({
    path: `src/db/${n}.ts`,
    profile: (["warm", "hot", "stale", "warm", "warm"] as Profile[])[i] as Profile,
  })),
  { path: "src/db/mongoAdapter.ts", profile: "deprecated" },
  // tests
  ...["pricing", "tax", "auth", "cart", "orders", "legacy"].map((n, i): Spec => ({
    path: `tests/${n}.test.ts`,
    profile: (["warm", "warm", "warm", "warm", "warm", "stale"] as Profile[])[i] as Profile,
  })),
  // scripts and root
  ...["deploy.sh", "backup.py", "seed-data.js", "release.mjs"].map((n, i): Spec => ({
    path: `scripts/${n}`,
    profile: (["stale", "stale", "unused", "warm"] as Profile[])[i] as Profile,
  })),
  { path: "config/webpack.legacy.js", profile: "stale" },
  { path: "config/app.ts", profile: "warm" },
  { path: "config/env.ts", profile: "warm" },
  { path: "docs/architecture.md", profile: "stale" },
  { path: "docs/runbook.md", profile: "warm" },
  { path: "server.ts", profile: "hot" },
  { path: "index.ts", profile: "warm" },
  { path: "README.md", profile: "warm" },
];

function sha(rng: () => number): string {
  let s = "";
  for (let i = 0; i < 7; i++) s += "0123456789abcdef"[Math.floor(rng() * 16)];
  return s;
}

function makeFile(spec: Spec, rng: () => number): FileInfo {
  let ageDays: number;
  let commits90d: number;
  let deprecated = false;
  let usedBy: () => number = () => randInt(rng, 1, 9);
  switch (spec.profile) {
    case "stale":
      ageDays = randInt(rng, 220, 1400);
      commits90d = 0;
      break;
    case "deprecated":
      ageDays = randInt(rng, 90, 900);
      commits90d = 0;
      deprecated = true;
      break;
    case "unused":
      ageDays = randInt(rng, 30, 150);
      commits90d = randInt(rng, 0, 2);
      usedBy = () => 0;
      break;
    case "hot":
      ageDays = randInt(rng, 0, 6);
      commits90d = randInt(rng, 12, 34);
      break;
    default:
      ageDays = randInt(rng, 8, 120);
      commits90d = randInt(rng, 0, 4);
  }
  const old = spec.profile === "stale" || spec.profile === "deprecated";
  const lastCommit: CommitInfo = {
    sha: sha(rng),
    message: pick(rng, old ? OLD_MESSAGES : FRESH_MESSAGES),
    author: pick(rng, AUTHORS),
    date: new Date(SAMPLE_NOW.getTime() - ageDays * DAY_MS).toISOString(),
  };
  const base = (spec.path.split("/").pop() ?? spec.path).replace(/\.[^.]+$/, "");
  const exportCount = /\.(ts|tsx|js|mjs)$/.test(spec.path) ? randInt(rng, 1, 3) : 0;
  const exports = Array.from({ length: exportCount }, (_, i) => ({
    name: i === 0 ? base.replace(/[^A-Za-z0-9_]/g, "_") : `${base.replace(/[^A-Za-z0-9_]/g, "_")}${i}`,
    usedBy: usedBy(),
  }));
  return {
    path: spec.path,
    loc: randInt(rng, 20, 640),
    lastCommit,
    commits90d,
    imports: [],
    exports,
    deprecated: deprecated || undefined,
  };
}

// [name, current, latest, monthsSinceRelease, deprecated]
const DEP_SPECS: [string, string, string, number, boolean][] = [
  ["react", "18.2.0", "18.3.1", 6, false],
  ["express", "4.17.1", "4.21.0", 5, false],
  ["lodash", "4.17.21", "4.17.21", 28, false],
  ["moment", "2.29.4", "2.30.1", 20, true],
  ["request", "2.88.2", "2.88.2", 70, true],
  ["webpack", "3.12.0", "5.95.0", 3, false],
  ["jquery", "1.12.4", "3.7.1", 14, false],
  ["typescript", "5.6.3", "5.6.3", 2, false],
  ["zod", "3.23.8", "3.23.8", 3, false],
  ["left-pad", "1.3.0", "1.3.0", 90, true],
  ["pg", "8.11.0", "8.13.0", 4, false],
  ["jest", "26.6.3", "29.7.0", 12, false],
  ["dayjs", "1.11.13", "1.11.13", 5, false],
  ["uuid", "9.0.1", "10.0.0", 8, false],
];

export function makeSampleSnapshot(seed = 666): RepoSnapshot {
  const rng = mulberry32(seed);
  const files = SPECS.map((s) => makeFile(s, rng));
  const deps: Dependency[] = DEP_SPECS.map(([name, current, latest, months, deprecated]) => ({
    name,
    current,
    latest,
    lastRelease: new Date(SAMPLE_NOW.getTime() - months * 30 * DAY_MS).toISOString(),
    deprecated,
  }));
  return { name: "haunted-monolith", files, deps };
}

export const SAMPLE_SNAPSHOT: RepoSnapshot = makeSampleSnapshot();
