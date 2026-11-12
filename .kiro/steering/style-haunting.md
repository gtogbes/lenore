# Lenore: haunting style guide

## Palette

| Role | Hex | Use |
| --- | --- | --- |
| Night sky / background | `#07060d` | Canvas clear color, page background |
| Fog | `#0d0b1a` | Scene fog, near 8, far 70 |
| Ground moss | `#14201a` | Plot ground tint |
| Stone | `#6b6f7a` | Tombstones (darker with age) |
| Lantern warm | `#ffb347` | Lantern light, scales to `#ff7a1a` at heat 1 |
| Ritual violet | `#9b6bff` | Resurrection glow and UI accents |
| Zombie rot | `#7aa05a` | Zombie skin, dependency labels |
| Bone text | `#e8e4d8` | UI text |

## Lighting and atmosphere

- Dim moonlight (intensity about 0.25, cool blue) plus warm point lights for lanterns.
- Lantern warmth: color lerps from `#ffb347` to `#ff7a1a` with heat; add a flicker of plus or minus 8 percent driven by a seeded phase, not `Math.random()`.
- Bloom is subtle (threshold 0.6). Vignette and a light noise pass. Never blow out the whole screen.
- Fog hides the horizon so the world feels endless.

## Typography and UI

System font stack only. Panels are translucent near-black with a thin violet border. Keep text short and legible over the 3D view.

## Tone of voice

- Playful, a little gothic, never cruel. "Here lies", "rest in peace", "the Necromancer wakes thee".
- Epitaphs quote the real last commit. Do not rewrite or mock the author.
- Captions and docs use plain punctuation. Never use em dashes anywhere in the repo; use a colon, comma or period instead. A hook checks Markdown files on save.

## Motion

Slow and eerie. Zombies shamble at 0.25 to 0.6 units per second. Ritual lasts about 6 to 8 seconds. Respect `prefers-reduced-motion` by shortening camera moves and disabling flicker.
