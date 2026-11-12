import { useEffect, useState } from "react";
import { useStore } from "../state/store.ts";

function Typewriter({ text, instant }: { text: string; instant: boolean }) {
  const [n, setN] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          window.clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 26);
    return () => window.clearInterval(id);
  }, [text, instant]);
  return <span>{text.slice(0, n)}</span>;
}

function diffClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "d-file";
  if (line.startsWith("@@")) return "d-hunk";
  if (line.startsWith("+")) return "d-add";
  if (line.startsWith("-")) return "d-del";
  return "d-ctx";
}

const VERDICT_TEXT = {
  bury: "Bury it",
  revive: "Revive it",
  refactor: "Refactor it",
} as const;

const RESOLVED_TEXT = {
  bury: "Laid to rest. Rest in peace.",
  revive: "It lives again. A mausoleum glows where the stone stood.",
  refactor: "Refactored and reborn. A mausoleum glows where the stone stood.",
} as const;

export function RitualPanel() {
  const phase = useStore((s) => s.ritualPhase);
  const plan = useStore((s) => s.ritualPlan);
  const demoMode = useStore((s) => s.demoMode);
  const reduced = useStore((s) => s.reducedMotion);
  // Coarse progress (20 steps) keeps this panel from re-rendering every frame.
  const stage = useStore((s) => Math.floor(s.ritualProgress * 20));
  const accept = useStore((s) => s.acceptRitual);
  const dismiss = useStore((s) => s.dismissRitual);

  if (phase === "idle") return null;

  const steps = plan?.steps ?? [];
  const shown = phase === "running" ? Math.min(steps.length, Math.ceil((stage / 20) * steps.length)) : steps.length;
  const current = steps[Math.max(0, shown - 1)];

  return (
    <>
      {phase === "running" && (
        <div className="ritual-overlay" aria-live="polite">
          <p className="ritual-line">
            {current ? <Typewriter key={shown} text={current.incantation} instant={reduced} /> : "The Necromancer wakes thee..."}
          </p>
          <div className="ritual-bar" aria-hidden="true">
            <span style={{ width: `${(stage / 20) * 100}%` }} />
          </div>
        </div>
      )}
      <aside className="panel ritual-panel" aria-label="Resurrection ritual">
        <div className="panel-head">
          <h2>The Necromancer wakes thee</h2>
        </div>
        {plan && <p className="path">{plan.path}</p>}
        <ol className="steps">
          {steps.slice(0, shown).map((st, i) => (
            <li key={st.title} className={i === shown - 1 && phase === "running" ? "now" : ""}>
              {st.title}
            </li>
          ))}
        </ol>
        {phase === "decision" && plan && (
          <>
            <p className={`verdict v-${plan.verdict}`}>
              Verdict: <strong>{VERDICT_TEXT[plan.verdict]}</strong>
            </p>
            <p className="summary">{plan.summary}</p>
            <pre className="diff" aria-label="Proposed diff">
              {plan.diff.split("\n").map((l, i) => (
                <span key={i} className={diffClass(l)}>
                  {l}
                  {"\n"}
                </span>
              ))}
            </pre>
            {demoMode ? (
              <p className="hint">The demo will accept this shortly.</p>
            ) : (
              <div className="row">
                <button type="button" className="primary" onClick={accept}>
                  Accept
                </button>
                <button type="button" onClick={dismiss}>
                  Entomb
                </button>
              </div>
            )}
          </>
        )}
        {phase === "resolved" && plan && (
          <>
            <p className={`verdict v-${plan.verdict}`}>{RESOLVED_TEXT[plan.verdict]}</p>
            {!demoMode && (
              <button type="button" className="wide" onClick={dismiss}>
                Close
              </button>
            )}
          </>
        )}
      </aside>
    </>
  );
}
