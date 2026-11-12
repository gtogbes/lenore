# Resurrection ritual: requirements

Clicking a tombstone "resurrects" it: the Necromancer proposes a cleanup while a ritual animation plays.

## User stories

1. As a developer, I want to click a tombstone and get a concrete cleanup proposal.
2. As a judge, I want the ritual to work offline with no API key.
3. As a developer, I want the proposal as readable diff text I can copy.

## Acceptance criteria (EARS)

1. WHEN the user clicks a tombstone, THE system SHALL select it and start the ritual.
2. THE default Necromancer SHALL work offline and SHALL NOT require an API key.
3. WHEN the same tombstone is resurrected twice, THE Necromancer SHALL return identical plans.
4. THE plan SHALL contain a verdict of `bury`, `revive` or `refactor`, at least three steps, diff text naming the file path, and a one line summary.
5. WHEN a tombstone has only `unused-exports` and is a year or more stale, THE verdict SHALL be `bury`.
6. WHILE the ritual plays, THE system SHALL show each step's incantation in order and glow the tombstone in ritual violet.
7. WHEN the ritual completes, THE system SHALL show the verdict, summary and diff in the side panel.
8. IF the user has `prefers-reduced-motion` set, THEN THE ritual SHALL use a shortened, flicker-free animation.
9. IF a real provider key (`VITE_NECROMANCER_KEY`) is present and the request fails, THEN THE system SHALL fall back to the mock Necromancer.
10. THE system SHALL NOT modify any file in the analyzed repository.
