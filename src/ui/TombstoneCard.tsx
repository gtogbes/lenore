import { useStore } from "../state/store.ts";

export function TombstoneCard() {
  const tomb = useStore((s) => (s.selectedId ? s.graveyard.tombstones.find((t) => t.id === s.selectedId) : undefined));
  const phase = useStore((s) => s.ritualPhase);
  const resolved = useStore((s) => (s.selectedId ? Boolean(s.resolved[s.selectedId]) : false));
  const demoMode = useStore((s) => s.demoMode);
  const select = useStore((s) => s.select);
  const beginRitual = useStore((s) => s.beginRitual);

  if (!tomb || phase !== "idle" || resolved) return null;
  const year = tomb.lastCommit.date.slice(0, 4);

  return (
    <aside className="panel card" aria-label="Tombstone">
      <div className="panel-head">
        <h2>Here lies</h2>
        <button type="button" className="icon" onClick={() => select(null)} aria-label="Close">
          x
        </button>
      </div>
      <p className="path">{tomb.path}</p>
      <blockquote className="epitaph">{tomb.epitaph}</blockquote>
      <dl className="facts">
        <dt>Last words by</dt>
        <dd>
          {tomb.lastCommit.author}, {year}
        </dd>
        <dt>Silent for</dt>
        <dd>{tomb.daysSinceCommit} days</dd>
        <dt>Size</dt>
        <dd>{tomb.loc} lines</dd>
        <dt>Cause</dt>
        <dd>{tomb.reasons.join(", ")}</dd>
      </dl>
      {!demoMode && (
        <button type="button" className="primary wide" onClick={beginRitual}>
          Resurrect
        </button>
      )}
    </aside>
  );
}
