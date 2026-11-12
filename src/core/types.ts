// Pure domain types. No React or Three imports allowed in src/core.

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  /** ISO 8601 date string. */
  date: string;
}

export interface ExportInfo {
  name: string;
  /** Number of other files that import this export. */
  usedBy: number;
}

export interface FileInfo {
  path: string;
  loc: number;
  lastCommit: CommitInfo;
  /** Commits touching this file in the last 90 days. */
  commits90d: number;
  imports: string[];
  exports: ExportInfo[];
  /** True when the file carries a deprecation marker (@deprecated, DEPRECATED). */
  deprecated?: boolean;
}

export interface Dependency {
  name: string;
  current: string;
  latest: string;
  /** ISO 8601 date of the latest release. */
  lastRelease: string;
  deprecated: boolean;
}

export interface RepoSnapshot {
  name: string;
  files: FileInfo[];
  deps: Dependency[];
}

export type TombstoneReason = "stale" | "deprecated" | "unused-exports";

export interface Tombstone {
  id: string;
  path: string;
  loc: number;
  reasons: TombstoneReason[];
  daysSinceCommit: number;
  epitaph: string;
  lastCommit: CommitInfo;
}

export interface Lantern {
  id: string;
  path: string;
  commits90d: number;
  /** Heat from 0 (barely warm) to 1 (blazing). */
  heat: number;
}

export type ZombieReason = "deprecated" | "major-behind" | "abandoned";

export interface Zombie {
  id: string;
  name: string;
  current: string;
  latest: string;
  reasons: ZombieReason[];
  /** Major versions behind latest (0 or more). */
  majorsBehind: number;
}

export interface Graveyard {
  repoName: string;
  tombstones: Tombstone[];
  lanterns: Lantern[];
  zombies: Zombie[];
}

export type RitualVerdict = "bury" | "revive" | "refactor";

export interface RitualStep {
  title: string;
  /** Narrated line shown while the ritual animation plays. */
  incantation: string;
}

export interface RitualPlan {
  tombstoneId: string;
  path: string;
  verdict: RitualVerdict;
  steps: RitualStep[];
  /** Unified diff style text. */
  diff: string;
  summary: string;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface Plot {
  dir: string;
  center: Vec2;
  radius: number;
}

export interface Placement<T> {
  item: T;
  pos: Vec2;
  /** Rotation around Y in radians. */
  rotation: number;
}

export interface ZombiePath {
  id: string;
  start: Vec2;
  /** Wander radius around start. */
  radius: number;
  /** Angular rate of the wander loop. The scene divides time by `radius` so the walk is about `speed` units per second. */
  speed: number;
  phase: number;
}

export interface GraveyardLayout {
  plots: Plot[];
  tombstones: Placement<Tombstone>[];
  lanterns: Placement<Lantern>[];
  zombies: ZombiePath[];
  /** Polyline segments of the paths lanterns line up along. */
  paths: Vec2[][];
}
