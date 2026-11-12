# Demo mode: design

## Timeline

`buildDemoScript(graveyard, anchors)` in `src/core/demoScript.ts` returns `DemoEvent[]` with `{t, duration, caption, action}`. Actions are `camera`, `highlight` or `ritual`. Anchors (positions from the layout) are passed in so core stays independent of layout internals.

Rough shape (seconds): establishing shot 0-10, plots 10-20, lantern 20-32, zombie 32-44, first tombstone and epitaph 44-58, ritual 58-82, wide breather 82-92, second tombstone 92-106, second ritual 106-130, offline message 130-140, outro 140-148.

## Playback

A `useDemo` hook in the UI keeps a clock in the zustand store (`demoTime`). Each frame it finds the latest event with `t <= demoTime`, lerps the camera toward its position and target, sets the caption, and fires ritual actions once. Manual orbit input or Escape cancels playback.

## Testing

`tests/sample.test.ts` checks monotonic times, the duration bound, at least two ritual events and no em dashes in captions.
