import { DEMO_DURATION } from "../core/demoScript.ts";
import { useStore } from "../state/store.ts";

export function DemoCaption() {
  const demoMode = useStore((s) => s.demoMode);
  const caption = useStore((s) => s.demoCaption);
  const percent = useStore((s) => Math.floor((s.demoTime / DEMO_DURATION) * 100));
  const stopDemo = useStore((s) => s.stopDemo);

  if (!demoMode) return null;
  return (
    <div className="caption-bar" role="status" aria-live="polite">
      <p>{caption}</p>
      <div className="caption-meta">
        <div className="caption-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <button type="button" onClick={stopDemo}>
          Stop <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  );
}
