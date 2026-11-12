import { useEffect, useMemo } from "react";
import { ambience } from "./audio/ambience.ts";
import { Scene } from "./scene/Scene.tsx";
import { useStore } from "./state/store.ts";
import { DemoCaption } from "./ui/DemoCaption.tsx";
import { Hud } from "./ui/Hud.tsx";
import { Legend } from "./ui/Legend.tsx";
import { RepoPanel } from "./ui/RepoPanel.tsx";
import { RitualPanel } from "./ui/RitualPanel.tsx";
import { SceneBoundary } from "./ui/SceneBoundary.tsx";
import { TombstoneCard } from "./ui/TombstoneCard.tsx";
import { WebglFallback, hasWebGL } from "./ui/WebglFallback.tsx";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export default function App() {
  const webgl = useMemo(hasWebGL, []);
  const muted = useStore((s) => s.muted);

  // Keyboard shortcuts: D demo, Esc close, M mute.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useStore.getState();
      const key = e.key.toLowerCase();
      if (key === "d") {
        if (s.demoMode) s.stopDemo();
        else s.startDemo();
      } else if (key === "m") {
        s.toggleMute();
      } else if (e.key === "Escape") {
        if (s.demoMode) s.stopDemo();
        else if (s.ritualPhase !== "idle") s.dismissRitual();
        else if (s.panelOpen) s.togglePanel(false);
        else s.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // WebAudio may only start after a user gesture.
  useEffect(() => {
    const start = () => ambience.start();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  useEffect(() => {
    ambience.setMuted(muted);
  }, [muted]);

  // Follow the OS reduced motion setting live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => useStore.getState().setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="app">
      <div className="stage">
        {webgl ? (
          <SceneBoundary>
            <Scene />
          </SceneBoundary>
        ) : (
          <WebglFallback />
        )}
      </div>
      <Hud />
      <RepoPanel />
      <TombstoneCard />
      <RitualPanel />
      <Legend />
      <DemoCaption />
    </div>
  );
}
