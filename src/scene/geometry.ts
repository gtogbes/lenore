import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Merge procedural parts into one geometry so a whole prop is a single instanced draw. */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  for (const g of parts) g.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Radial soft-edge texture used for halos and mist. */
export function makeGlowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FONT = 'ui-serif, Georgia, "Times New Roman", serif';

/** Word wrap `text` to fit `w`, shrinking the font until it fits `h`. */
function drawWrapped(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, color: string): void {
  const pad = 10;
  for (let size = 34; size >= 12; size -= 2) {
    ctx.font = `italic ${size}px ${FONT}`;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > w - pad * 2 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const lineH = size * 1.2;
    if (lines.length * lineH <= h - pad * 2 || size === 12) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const top = h / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillText(l, w / 2 + 1.5, top + i * lineH + 1.5);
        ctx.fillStyle = color;
        ctx.fillText(l, w / 2, top + i * lineH);
      });
      return;
    }
  }
}

export function makeTextTexture(text: string, w: number, h: number, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) drawWrapped(ctx, text, w, h, color);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
