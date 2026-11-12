import { useStore } from "../state/store.ts";

export function Hud() {
  const repoName = useStore((s) => s.repoName);
  const tombs = useStore((s) => s.graveyard.tombstones.length);
  const lanterns = useStore((s) => s.graveyard.lanterns.length);
  const zombies = useStore((s) => s.graveyard.zombies.length);
  const laidToRest = useStore((s) => Object.keys(s.resolved).length);
  const demoMode = useStore((s) => s.demoMode);
  const muted = useStore((s) => s.muted);
  const quality = useStore((s) => s.quality);
  const panelOpen = useStore((s) => s.panelOpen);
  const introDone = useStore((s) => s.introDone);
  const startDemo = useStore((s) => s.startDemo);
  const stopDemo = useStore((s) => s.stopDemo);
  const toggleMute = useStore((s) => s.toggleMute);
  const setQuality = useStore((s) => s.setQuality);
  const togglePanel = useStore((s) => s.togglePanel);

  return (
    <header className={`hud ${introDone ? "hud-in" : "hud-pre"}`}>
      <div className="hud-title">
        <h1>Lenore</h1>
        <p className="hud-sub">
          Here lies <strong>{repoName}</strong>
        </p>
      </div>
      <ul className="hud-counters" aria-label="Graveyard counts">
        <li className="c-tomb">
          <b>{tombs - laidToRest}</b> tombstones
        </li>
        <li className="c-lantern">
          <b>{lanterns}</b> lanterns
        </li>
        <li className="c-zombie">
          <b>{zombies}</b> zombies
        </li>
        {laidToRest > 0 && (
          <li className="c-rest">
            <b>{laidToRest}</b> laid to rest
          </li>
        )}
      </ul>
      <nav className="hud-actions" aria-label="Controls">
        <button type="button" className={demoMode ? "on" : ""} onClick={() => (demoMode ? stopDemo() : startDemo())} title="Toggle demo (D)">
          {demoMode ? "Stop demo" : "Demo"} <kbd>D</kbd>
        </button>
        <button type="button" onClick={() => togglePanel()} className={panelOpen ? "on" : ""} title="Load a repo">
          Load repo
        </button>
        <button type="button" onClick={toggleMute} title="Toggle sound (M)">
          {muted ? "Sound off" : "Sound on"} <kbd>M</kbd>
        </button>
        <button type="button" onClick={() => setQuality(quality === "high" ? "low" : "high")} title="Toggle heavy effects">
          Effects: {quality}
        </button>
      </nav>
    </header>
  );
}
