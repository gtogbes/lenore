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
  const hasToken = useStore((s) => s.hasToken);
  const setToken = useStore((s) => s.setToken);
  const forgetToken = useStore((s) => s.forgetToken);
  const [repo, setRepo] = useState("");
  const [tokenText, setTokenText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void loadFromGithub(repo);
  };

  const saveToken = (e: FormEvent) => {
    e.preventDefault();
    setToken(tokenText);
    setTokenText("");
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
      <button
        type="button"
        className="wide"
        disabled={loading || repo.trim() === ""}
        onClick={() => void loadFromGithub(repo, true)}
      >
        Dig up again (skip saved copy)
      </button>
      {hasToken ? (
        <div className="row">
          <span className="hint">Token set for this tab.</span>
          <button type="button" onClick={forgetToken}>Forget token</button>
        </div>
      ) : (
        <form onSubmit={saveToken} className="row">
          <input
            type="password"
            value={tokenText}
            onChange={(e) => setTokenText(e.target.value)}
            placeholder="GitHub token (optional)"
            aria-label="GitHub token (optional)"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={tokenText.trim() === ""}>Use token</button>
        </form>
      )}
      <button type="button" className="wide" onClick={() => fileInput.current?.click()}>
        Upload snapshot JSON
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={upload} />
      <p className="hint">
        Public repos only, about 40 files, unauthenticated unless you add a token. A token is optional: it raises
        the limit from 60 to 5,000 requests per hour, stays in this tab only and is sent only to api.github.com.{" "}
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer noopener">
          Create a read-only fine-grained token
        </a>
        . Loaded repos are saved in this browser for an hour. For a full local scan run
        <code> node scripts/scan-repo.mjs &lt;dir&gt; out.json</code> and upload the result.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
    </aside>
  );
}
