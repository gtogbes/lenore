import type { Graveyard, Vec2 } from "./types.ts";

export type DemoAction =
  | { kind: "camera"; position: [number, number, number]; target: [number, number, number] }
  | { kind: "highlight"; tombstoneId: string }
  | { kind: "ritual"; tombstoneId: string }
  | { kind: "caption" };

export interface DemoEvent {
  /** Start time in seconds from the beginning of the demo. */
  t: number;
  /** How long the event holds, in seconds. */
  duration: number;
  caption: string;
  action: DemoAction;
}

export const DEMO_DURATION = 150;

/** Positions are looked up by the caller so this module stays free of layout details. */
export interface DemoAnchors {
  tombstones: { id: string; pos: Vec2 }[];
  lanterns: { id: string; pos: Vec2 }[];
  zombies: { id: string; pos: Vec2 }[];
}

function cam(from: Vec2, height: number, back: number, at: Vec2, atY = 1): DemoAction {
  const dx = from.x - at.x;
  const dz = from.z - at.z;
  const len = Math.max(1e-6, Math.hypot(dx, dz));
  return {
    kind: "camera",
    position: [at.x + (dx / len) * back, height, at.z + (dz / len) * back],
    target: [at.x, atY, at.z],
  };
}

/**
 * Builds a ~150 s timeline. Event start times are strictly increasing and every event
 * ends before DEMO_DURATION. Contains at least two ritual triggers when the graveyard
 * has two or more tombstones.
 */
export function buildDemoScript(g: Graveyard, anchors: DemoAnchors): DemoEvent[] {
  const events: DemoEvent[] = [];
  let t = 0;
  const push = (duration: number, caption: string, action: DemoAction) => {
    events.push({ t, duration, caption, action });
    t += duration;
  };
  const origin: Vec2 = { x: 0, z: 0 };
  const oldest = [...g.tombstones].sort((a, b) => b.daysSinceCommit - a.daysSinceCommit);
  const posOf = (id: string): Vec2 => anchors.tombstones.find((a) => a.id === id)?.pos ?? origin;

  push(10, `Welcome to Lenore: ${g.repoName}, a codebase after dark.`, cam({ x: 30, z: 30 }, 22, 40, origin, 0));
  push(10, "Every top-level folder is a plot. Every file is a resident.", cam({ x: -30, z: 20 }, 14, 30, origin, 0));

  const lantern = anchors.lanterns[0];
  if (lantern) {
    push(12, "Lanterns glow where the team commits most. Hot files, warm light.", cam(origin, 4, 8, lantern.pos, 1.5));
  }
  const zombie = anchors.zombies[0];
  if (zombie) {
    push(12, "Stale or deprecated dependencies crawl the outskirts as zombies.", cam(origin, 5, 10, zombie.pos, 1));
  }

  const first = oldest[0];
  const second = oldest[1];
  if (first) {
    const p = posOf(first.id);
    push(8, `Dead code gets a tombstone. ${first.path}: ${first.daysSinceCommit} days silent.`, cam(origin, 3, 6, p, 1.2));
    events.push({ t, duration: 6, caption: first.epitaph, action: { kind: "highlight", tombstoneId: first.id } });
    t += 6;
    push(24, "Click a tombstone and the Necromancer begins the ritual.", { kind: "ritual", tombstoneId: first.id });
  }
  push(10, "The graveyard breathes. Lanterns flicker. Fog rolls in.", cam({ x: 20, z: -25 }, 10, 28, origin, 1));
  if (second) {
    const p = posOf(second.id);
    push(8, `Another resident: ${second.path}, ${second.daysSinceCommit} days without a visit.`, cam(origin, 3, 6, p, 1.2));
    events.push({ t, duration: 6, caption: second.epitaph, action: { kind: "highlight", tombstoneId: second.id } });
    t += 6;
    push(24, "A second ritual: bury it, revive it, or refactor it. All offline.", { kind: "ritual", tombstoneId: second.id });
  }
  push(10, "No repo? No key? The sample graveyard needs neither.", cam({ x: -25, z: -25 }, 18, 38, origin, 0));
  const remaining = DEMO_DURATION - t - 1;
  if (remaining > 2) {
    push(Math.min(remaining, 8), "Point Lenore at your own repo and see what has died. Happy Kiroween.", cam({ x: 35, z: 0 }, 25, 45, origin, 0));
  }
  return events;
}
