import { PALETTE } from "../scene/palette.ts";

const ITEMS = [
  { color: PALETTE.stone, label: "Tombstone", note: "dead code" },
  { color: PALETTE.lantern, label: "Lantern", note: "hot file" },
  { color: PALETTE.rot, label: "Zombie", note: "stale dependency" },
  { color: PALETTE.violet, label: "Ritual", note: "click a tombstone" },
] as const;

export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      {ITEMS.map((i) => (
        <li key={i.label}>
          <span className="swatch" style={{ background: i.color }} />
          <b>{i.label}</b> {i.note}
        </li>
      ))}
    </ul>
  );
}
