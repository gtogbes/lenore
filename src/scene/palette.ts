// Palette from .kiro/steering/style-haunting.md. Shared by scene and UI.
export const PALETTE = {
  night: "#07060d",
  fog: "#0d0b1a",
  moss: "#14201a",
  stone: "#6b6f7a",
  lantern: "#ffb347",
  lanternHot: "#ff7a1a",
  violet: "#9b6bff",
  rot: "#7aa05a",
  bone: "#e8e4d8",
  horizon: "#1a1440",
  moonlight: "#8aa0ff",
} as const;

export const FOG_NEAR = 8;
export const FOG_FAR = 70;

/** Smoothstep on [a, b]. */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Outer radius of the burial grounds, used to size the fence, camera and trees. */
export function reachOf(plots: { center: { x: number; z: number }; radius: number }[]): number {
  return plots.reduce((m, p) => Math.max(m, Math.hypot(p.center.x, p.center.z) + p.radius), 12);
}

/** Radius of the iron fence ring around the burial grounds. */
export function fenceRadius(reach: number): number {
  return reach + 8;
}
