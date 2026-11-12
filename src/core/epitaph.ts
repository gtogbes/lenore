import type { CommitInfo } from "./types.ts";
import { hashString } from "./prng.ts";

export const EPITAPH_MAX = 80;

const OPENERS = ["Here lies", "Rest in peace:", "Gone but logged:", "In memory of", "Last words of"];

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, Math.max(0, max));
  return s.slice(0, max - 1).trimEnd() + "\u2026";
}

function year(date: string): string {
  const y = new Date(date).getUTCFullYear();
  return Number.isFinite(y) ? String(y) : "????";
}

/**
 * Deterministic epitaph from the last commit. Always at most EPITAPH_MAX characters.
 * Format: `<opener> "<message>" by <author>, <year>`; the message is trimmed first.
 */
export function makeEpitaph(commit: CommitInfo, path = ""): string {
  const firstLine = (commit.message.split("\n")[0] ?? "").trim() || "no last words";
  const author = commit.author.trim() || "unknown";
  const opener = OPENERS[hashString(path + commit.sha) % OPENERS.length] as string;
  const tail = ` by ${author}, ${year(commit.date)}`;
  const head = `${opener} "`;
  const room = EPITAPH_MAX - head.length - 1 - tail.length;
  if (room >= 8) {
    return clip(`${head}${clip(firstLine, room)}"${tail}`, EPITAPH_MAX);
  }
  // Very long author name: drop the opener and clip the whole thing.
  return clip(`"${firstLine}" ${author}`, EPITAPH_MAX);
}
