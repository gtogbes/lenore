import { fenceRadius } from "./palette.ts";

export type V3 = [number, number, number];

export interface IntroPoints {
  start: V3;
  end: V3;
  lookStart: V3;
  lookEnd: V3;
}

export const INTRO_SECONDS = 5;
export const INTRO_SECONDS_REDUCED = 1.2;

/**
 * Fly-in over the fog: begin high and far beyond the gate (+z) with the moon framed in the sky,
 * then settle at a gentle orbit position looking at the hub.
 */
export function introPoints(reach: number): IntroPoints {
  const R = fenceRadius(reach);
  return {
    start: [0.45 * R, 0.35 * R + 12, 1.15 * R + 24],
    end: [0.3 * R + 4, 0.14 * R + 6, 0.78 * R + 8],
    lookStart: [-8, 14, -40],
    lookEnd: [0, 2, 0],
  };
}
