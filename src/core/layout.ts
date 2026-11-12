import type {
  Graveyard,
  GraveyardLayout,
  Lantern,
  Placement,
  Plot,
  Tombstone,
  Vec2,
  ZombiePath,
} from "./types.ts";
import { hashString, mulberry32 } from "./prng.ts";

/** Minimum distance between any two markers (tombstones and lanterns). */
export const MIN_MARKER_DISTANCE = 2.2;
const CELL = MIN_MARKER_DISTANCE * 1.5;
const JITTER = MIN_MARKER_DISTANCE * 0.2;
const GATE_CLEARANCE = 6;
/** Zombie band beyond the outermost plot: centre and half width, in units past `reach`. Fence sits at reach + 8. */
const BAND_CENTER = 4.5;
const BAND_HALF_WIDTH = 3;

export function topDir(path: string): string {
  const i = path.indexOf("/");
  return i === -1 ? "." : path.slice(0, i);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

interface Marker {
  kind: "tomb" | "lantern";
  id: string;
  tomb?: Tombstone;
  lantern?: Lantern;
}

/** Grid cell offsets sorted by distance from the center, ties broken by coordinates. */
function cellOffsets(count: number): Vec2[] {
  const side = Math.ceil(Math.sqrt(count)) + 2;
  const half = Math.floor(side / 2);
  const cells: Vec2[] = [];
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) cells.push({ x: i * CELL, z: j * CELL });
  }
  cells.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || a.x - b.x || a.z - b.z);
  return cells.slice(0, count);
}

/**
 * Deterministic layout. One circular plot per top-level directory, plots never overlap,
 * and every pair of markers is at least MIN_MARKER_DISTANCE apart.
 */
export function layoutGraveyard(g: Graveyard, seed = 1337): GraveyardLayout {
  const groups = new Map<string, Marker[]>();
  const add = (dir: string, m: Marker) => {
    const list = groups.get(dir);
    if (list) list.push(m);
    else groups.set(dir, [m]);
  };
  for (const t of g.tombstones) add(topDir(t.path), { kind: "tomb", id: t.id, tomb: t });
  for (const l of g.lanterns) add(topDir(l.path), { kind: "lantern", id: l.id, lantern: l });

  const dirs = [...groups.keys()].sort();
  const plots: Plot[] = [];
  const tombstones: Placement<Tombstone>[] = [];
  const lanterns: Placement<Lantern>[] = [];
  const paths: Vec2[][] = [];
  const origin: Vec2 = { x: 0, z: 0 };

  // Largest plots first so they take the best spots; ordering is still deterministic.
  const ordered = dirs
    .map((dir) => ({ dir, markers: (groups.get(dir) as Marker[]).slice().sort((a, b) => (a.id < b.id ? -1 : 1)) }))
    .sort((a, b) => b.markers.length - a.markers.length || (a.dir < b.dir ? -1 : 1));

  for (const { dir, markers } of ordered) {
    const offsets = cellOffsets(markers.length);
    const maxOff = offsets.reduce((m, o) => Math.max(m, Math.hypot(o.x, o.z)), 0);
    const radius = maxOff + JITTER + MIN_MARKER_DISTANCE / 2;

    // Walk an outward golden-angle spiral until the plot fits without overlap.
    const rng0 = mulberry32(seed ^ hashString(dir));
    const startAngle = rng0() * Math.PI * 2;
    let center: Vec2 = origin;
    for (let k = 0; k < 10_000; k++) {
      const r = GATE_CLEARANCE + radius + k * 0.8;
      const ang = startAngle + k * 2.399963;
      const c = { x: Math.cos(ang) * r, z: Math.sin(ang) * r };
      const ok = plots.every((p) => dist(p.center, c) >= p.radius + radius + MIN_MARKER_DISTANCE);
      if (ok) {
        center = c;
        break;
      }
    }
    plots.push({ dir, center, radius });

    const rng = mulberry32(seed ^ hashString("markers:" + dir));
    markers.forEach((m, i) => {
      const off = offsets[i] as Vec2;
      const pos = {
        x: center.x + off.x + (rng() * 2 - 1) * JITTER,
        z: center.z + off.z + (rng() * 2 - 1) * JITTER,
      };
      const rotation = (rng() - 0.5) * 0.5;
      if (m.kind === "tomb") tombstones.push({ item: m.tomb as Tombstone, pos, rotation });
      else lanterns.push({ item: m.lantern as Lantern, pos, rotation });
    });

    // Path from the gate toward the plot edge.
    const len = Math.max(1e-6, Math.hypot(center.x, center.z));
    const edge = { x: center.x * (1 - radius / len), z: center.z * (1 - radius / len) };
    paths.push([origin, edge]);
  }

  // Zombies shamble in the outskirts beyond the outermost plot.
  const reach = plots.reduce((m, p) => Math.max(m, Math.hypot(p.center.x, p.center.z) + p.radius), GATE_CLEARANCE);
  const zombies: ZombiePath[] = g.zombies.map((z, i) => {
    const rng = mulberry32(seed ^ hashString(z.id));
    const ang = (i / Math.max(1, g.zombies.length)) * Math.PI * 2 + rng() * 0.6;
    // Keep the whole wander loop inside the outskirts band [reach + 1.5, reach + 7.5], inside the fence
    // at reach + 8. The path can stray radially by at most radius * sqrt(2).
    const radius = 1.5 + rng() * 0.6;
    const slack = BAND_HALF_WIDTH - Math.SQRT2 * radius;
    const r = reach + BAND_CENTER + (rng() * 2 - 1) * slack;
    return {
      id: z.id,
      start: { x: Math.cos(ang) * r, z: Math.sin(ang) * r },
      radius,
      speed: 0.25 + rng() * 0.35,
      phase: rng() * Math.PI * 2,
    };
  });

  return { plots, tombstones, lanterns, zombies, paths };
}

/** Position of a wandering zombie at time t (seconds). Pure helper used by the scene. */
export function zombiePosition(p: ZombiePath, t: number): Vec2 {
  const a = p.phase + t * p.speed;
  return { x: p.start.x + Math.cos(a) * p.radius, z: p.start.z + Math.sin(a * 0.7) * p.radius };
}
