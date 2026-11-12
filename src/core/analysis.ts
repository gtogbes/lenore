import type {
  Dependency,
  FileInfo,
  Graveyard,
  Lantern,
  RepoSnapshot,
  Tombstone,
  TombstoneReason,
  Zombie,
  ZombieReason,
} from "./types.ts";
import { makeEpitaph } from "./epitaph.ts";

export const STALE_DAYS = 180;
export const LANTERN_MIN_COMMITS = 5;
export const LANTERN_MAX_COMMITS = 30;
export const ABANDONED_DAYS = 730;
const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, now: Date): number {
  const t = new Date(fromIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

/** Parse the leading integer of a version string such as "^4.17.1" or "v2.0.0". */
export function majorOf(version: string): number {
  const m = /(\d+)/.exec(version);
  return m ? Number(m[1]) : 0;
}

export function tombstoneReasons(file: FileInfo, now: Date): TombstoneReason[] {
  const reasons: TombstoneReason[] = [];
  if (daysBetween(file.lastCommit.date, now) >= STALE_DAYS) reasons.push("stale");
  if (file.deprecated === true) reasons.push("deprecated");
  if (file.exports.length > 0 && file.exports.every((e) => e.usedBy === 0)) {
    reasons.push("unused-exports");
  }
  return reasons;
}

export function lanternHeat(commits90d: number): number {
  const span = LANTERN_MAX_COMMITS - LANTERN_MIN_COMMITS;
  const h = (commits90d - LANTERN_MIN_COMMITS) / span;
  return Math.min(1, Math.max(0, h));
}

export function zombieReasons(dep: Dependency, now: Date): ZombieReason[] {
  const reasons: ZombieReason[] = [];
  if (dep.deprecated) reasons.push("deprecated");
  if (majorOf(dep.latest) - majorOf(dep.current) >= 1) reasons.push("major-behind");
  if (daysBetween(dep.lastRelease, now) >= ABANDONED_DAYS) reasons.push("abandoned");
  return reasons;
}

/** Classify a snapshot into tombstones, lanterns and zombies. Pure and deterministic. */
export function classify(snapshot: RepoSnapshot, now: Date): Graveyard {
  const tombstones: Tombstone[] = [];
  const lanterns: Lantern[] = [];
  for (const file of snapshot.files) {
    const reasons = tombstoneReasons(file, now);
    if (reasons.length > 0) {
      tombstones.push({
        id: `tomb:${file.path}`,
        path: file.path,
        loc: file.loc,
        reasons,
        daysSinceCommit: daysBetween(file.lastCommit.date, now),
        epitaph: makeEpitaph(file.lastCommit, file.path),
        lastCommit: file.lastCommit,
      });
    } else if (file.commits90d >= LANTERN_MIN_COMMITS) {
      lanterns.push({
        id: `lantern:${file.path}`,
        path: file.path,
        commits90d: file.commits90d,
        heat: lanternHeat(file.commits90d),
      });
    }
  }
  const zombies: Zombie[] = [];
  for (const dep of snapshot.deps) {
    const reasons = zombieReasons(dep, now);
    if (reasons.length > 0) {
      zombies.push({
        id: `zombie:${dep.name}`,
        name: dep.name,
        current: dep.current,
        latest: dep.latest,
        reasons,
        majorsBehind: Math.max(0, majorOf(dep.latest) - majorOf(dep.current)),
      });
    }
  }
  return { repoName: snapshot.name, tombstones, lanterns, zombies };
}
