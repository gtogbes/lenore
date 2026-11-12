import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DEMO_DURATION } from "../core/demoScript.ts";
import type { DemoEvent } from "../core/demoScript.ts";
import { useStore } from "../state/store.ts";

/** Seconds the ritual waits on the Accept / Entomb decision before the demo accepts for you. */
const AUTO_ACCEPT_AFTER = 3;

function enter(ev: DemoEvent): void {
  const s = useStore.getState();
  s.setDemoCaption(ev.caption);
  // Every new shot closes whatever the previous one left open.
  if (s.ritualPhase !== "idle") s.dismissRitual();
  const a = ev.action;
  if (a.kind === "camera") {
    s.select(null);
    s.setDemoShot(a.position, a.target);
  } else if (a.kind === "highlight") {
    s.select(a.tombstoneId);
  } else if (a.kind === "ritual") {
    s.select(a.tombstoneId);
    s.beginRitual();
  }
}

/**
 * Drives the scripted demo from src/core/demoScript.ts. Renders nothing. Runs the clock,
 * fires each event once, and accepts rituals so the whole tour plays without input.
 */
export function DemoDirector() {
  const last = useRef(-1);
  const decisionAt = useRef<number | null>(null);

  useFrame((_, delta) => {
    const s = useStore.getState();
    if (!s.demoMode) {
      last.current = -1;
      decisionAt.current = null;
      return;
    }
    const t = s.demoTime + Math.min(delta, 0.1);
    if (t >= DEMO_DURATION) {
      s.stopDemo();
      return;
    }
    s.setDemoTime(t);

    const script = s.demoScript;
    let idx = -1;
    for (let i = 0; i < script.length; i++) {
      if ((script[i] as DemoEvent).t <= t) idx = i;
      else break;
    }
    while (last.current < idx) {
      last.current += 1;
      enter(script[last.current] as DemoEvent);
    }

    const phase = useStore.getState().ritualPhase;
    if (phase === "decision") {
      if (decisionAt.current === null) decisionAt.current = t;
      else if (t - decisionAt.current >= AUTO_ACCEPT_AFTER) {
        useStore.getState().acceptRitual();
        decisionAt.current = null;
      }
    } else decisionAt.current = null;
  });

  return null;
}
