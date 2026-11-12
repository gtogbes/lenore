# Demo mode: requirements

A scripted, hands-free tour of about 150 seconds for judges and the demo video.

## Acceptance criteria (EARS)

1. WHEN the user presses "Play demo", THE system SHALL run a scripted timeline of about 150 seconds.
2. THE timeline SHALL have strictly increasing event start times and SHALL end within 150 seconds.
3. THE timeline SHALL include camera shots of the whole graveyard, a lantern, a zombie and at least two tombstones.
4. THE timeline SHALL trigger at least two resurrection rituals.
5. WHILE the demo plays, THE system SHALL show the current caption in a caption bar.
6. WHEN the user presses Escape or moves the camera manually, THE system SHALL stop the demo and return control.
7. THE demo SHALL use only the built-in sample or the currently loaded graveyard and SHALL NOT need network access.
8. THE captions SHALL NOT contain em dashes.
9. WHEN the graveyard has fewer than two tombstones, THE system SHALL still build a valid timeline with the rituals it can support.
