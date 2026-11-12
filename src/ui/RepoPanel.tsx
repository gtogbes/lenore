import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useStore } from "../state/store.ts";

export function RepoPanel() {
  const open = useStore((s) => s.panelOpen);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.loadError);
  const loadSample = useStore((s) => s.loadSample);
  const loadFromGithub = useStore((s) => s.loadFromGithub);
  const loadFromJson = useStore((s) => s.loadFromJson);
  const togglePanel = useStore((s) => s.togglePanel);
  const [repo, setRepo] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void loadFromGithub(repo);
  };

  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(loadFromJson, () => useStore.setState({ loadError: "Could not read that file." }));
    e.target.value = "";
  };

  return (
    <aside className="panel repo-panel" aria-label="Load a repository">
      <div className="panel-head">
        <h2>Choose a graveyard</h2>
        <button type="button" className="icon" onClick={() => togglePanel(false)} aria-label="Close">
          x
        </button>
      </div>
      <button type="button" className="wide" onClick={() => { loadSample(); togglePanel(false); }}>
        Haunted monolith (built-in sample)
      </button>
      <form onSubmit={submit} className="row">
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="owner/name or github.com URL"
          aria-label="GitHub repository"
          spellCheck={false}
        />
        <button type="submit" disabled={loading || repo.trim() === ""}>
          {loading ? "Digging..." : "Dig up"}
        </button>
      </form>
      <button type="button" className="wide" onClick={() => fileInput.current?.click()}>
        Upload snapshot JSON
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={upload} />
      <p className="hint">
        Public repos only, unauthenticated, about 40 files. For a full local scan run
        <code> node scripts/scan-repo.mjs &lt;dir&gt; out.json</code> and upload the result.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
    </aside>
  );
}
