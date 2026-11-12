import * as THREE from "three";
import type { Tombstone } from "../core/types.ts";
import { hashString } from "../core/prng.ts";
import { mergeParts } from "./geometry.ts";

export const VARIANT_COUNT = 4;

export function variantOf(id: string): number {
  return hashString(id) % VARIANT_COUNT;
}

/** Uniform instance scale, sized by lines of code. */
export function tombScale(t: Pick<Tombstone, "loc">): number {
  return 0.8 + 0.8 * Math.min(1, t.loc / 500);
}

/** Unscaled height of each variant (slab, cross, obelisk, arch). */
export const VARIANT_HEIGHT = [1.3, 1.5, 2.2, 1.45];

/** Plaque that carries the epitaph, in unscaled local units. Front of each stone faces +z. */
export const PLAQUE = [
  { y: 0.6, z: 0.1, w: 0.62, h: 0.5 },
  { y: 0.42, z: 0.1, w: 0.6, h: 0.34 },
  { y: 0.6, z: 0.2, w: 0.5, h: 0.4 },
  { y: 0.5, z: 0.0, w: 0.44, h: 0.44 },
];

function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function plaque(v: number): THREE.BufferGeometry {
  const p = PLAQUE[v] as (typeof PLAQUE)[number];
  return box(p.w, p.h, 0.06, 0, p.y, p.z);
}

export function buildTombGeometry(variant: number): THREE.BufferGeometry {
  switch (variant) {
    case 1: {
      // cross
      return mergeParts([
        box(0.85, 0.14, 0.55, 0, 0.07, 0),
        box(0.22, 1.4, 0.18, 0, 0.7, 0),
        box(0.75, 0.2, 0.18, 0, 1.05, 0),
        plaque(1),
      ]);
    }
    case 2: {
      // obelisk
      const shaft = new THREE.CylinderGeometry(0.12, 0.3, 1.8, 4, 1);
      shaft.rotateY(Math.PI / 4);
      shaft.translate(0, 0.9 + 0.14, 0);
      const cap = new THREE.ConeGeometry(0.12 * Math.SQRT2 * 0.72, 0.28, 4, 1);
      cap.rotateY(Math.PI / 4);
      cap.translate(0, 2.08, 0);
      return mergeParts([box(0.9, 0.14, 0.9, 0, 0.07, 0), shaft, cap, plaque(2)]);
    }
    case 3: {
      // arch
      const arc = new THREE.TorusGeometry(0.32, 0.09, 8, 16, Math.PI);
      arc.translate(0, 1.0, 0);
      return mergeParts([
        box(0.95, 0.14, 0.5, 0, 0.07, 0),
        box(0.18, 0.9, 0.2, -0.32, 0.59, 0),
        box(0.18, 0.9, 0.2, 0.32, 0.59, 0),
        arc,
        plaque(3),
      ]);
    }
    default: {
      // slab with a rounded top
      const top = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 20, 1);
      top.rotateX(Math.PI / 2);
      top.translate(0, 0.9, 0);
      return mergeParts([box(1.0, 0.12, 0.38, 0, 0.06, 0), box(0.8, 0.84, 0.19, 0, 0.54, 0), top, plaque(0)]);
    }
  }
}
