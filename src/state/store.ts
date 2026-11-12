import { create } from "zustand";
import { classify } from "../core/analysis.ts";
import { buildDemoScript } from "../core/demoScript.ts";
import type { DemoEvent } from "../core/demoScript.ts";
import { fetchGithubSnapshot } from "../core/githubIngest.ts";
import { clearToken, readCache, readToken, writeCache, writeToken } from "./githubStorage.ts";
import { layoutGraveyard } from "../core/layout.ts";
import { createNecromancer, planRitual } from "../core/necromancer.ts";
import { SAMPLE_NOW, SAMPLE_SNAPSHOT } from "../core/sampleRepo.ts";
import type { Graveyard, GraveyardLayout, RepoSnapshot, RitualPlan, RitualVerdict } from "../core/types.ts";

export type RitualPhase = "idle" | "running" | "decision" | "resolved";
export type Quality = "high" | "low";

export interface DemoShot {
  key: number;
  position: [number, number, number];
  target: [number, number, number];
}

export interface NecroState {
  repoName: string;
  graveyard: Graveyard;
  layout: GraveyardLayout;
  loading: boolean;
  loadError: string | null;
  panelOpen: boolean;

  selectedId: string | null;
  hoveredId: string | null;

  ritualPhase: RitualPhase;
  ritualId: string | null;
  /** 0..1, advanced by the scene each frame. Do not subscribe to this from busy UI. */
  ritualProgress: number;
  ritualPlan: RitualPlan | null;
  /** Tombstones already dealt with in this session. */
  resolved: Record<string, RitualVerdict>;

  demoMode: boolean;
  demoTime: number;
  demoScript: DemoEvent[];
  demoCaption: string;
  demoShot: DemoShot | null;

  introDone: boolean;
  quality: Quality;
  muted: boolean;
  reducedMotion: boolean;

  loadSample: () => void;
  loadSnapshot: (snapshot: RepoSnapshot, now: Date) => void;
  hasToken: boolean;
  setToken: (token: string) => void;
  forgetToken: () => void;
  loadFromGithub: (input: string, refresh?: boolean) => Promise<void>;
  loadFromJson: (text: string) => void;
  togglePanel: (open?: boolean) => void;

  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  beginRitual: () => void;
  advanceRitual: (dt: number) => void;
  acceptRitual: () => void;
  dismissRitual: () => void;

  startDemo: () => void;
  stopDemo: () => void;
  setDemoTime: (t: number) => void;
  setDemoCaption: (caption: string) => void;
  setDemoShot: (position: [number, number, number], target: [number, number, number]) => void;

  setIntroDone: () => void;
  setQuality: (q: Quality) => void;
  toggleMute: () => void;
  setReducedMotion: (v: boolean) => void;
}

const necromancer = createNecromancer();

/** The ritual lasts 6 to 8 seconds per the style guide. */
export function ritualSeconds(reducedMotion: boolean): number {
  return reducedMotion ? 6 : 7.5;
}

/** Accepts "owner/name" or a github.com URL. Returns "owner/name" or null. */
export function parseRepoInput(input: string): string | null {
  const m = input.trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFileLike(f: unknown): boolean {
  if (!isRecord(f) || !isRecord(f.lastCommit)) return false;
  const c = f.lastCommit;
  return (
    typeof f.path === "string" &&
    typeof f.loc === "number" &&
    typeof f.commits90d === "number" &&
    Array.isArray(f.imports) &&
    Array.isArray(f.exports) &&
    typeof c.message === "string" &&
    typeof c.author === "string" &&
    typeof c.date === "string" &&
    typeof c.sha === "string"
  );
}

function isExportLike(e: unknown): boolean {
  return isRecord(e) && typeof e.name === "string" && typeof e.usedBy === "number";
}

function isDepLike(d: unknown): boolean {
  return (
    isRecord(d) &&
    typeof d.name === "string" &&
    typeof d.current === "string" &&
    typeof d.latest === "string" &&
    typeof d.lastRelease === "string" &&
    typeof d.deprecated === "boolean"
  );
}

/** Deep shape check so a malformed upload is rejected up front rather than throwing inside classify. */
export function isSnapshot(v: unknown): v is RepoSnapshot {
  if (!isRecord(v)) return false;
  return (
    typeof v.name === "string" &&
    Array.isArray(v.files) &&
    v.files.every((f) => isFileLike(f) && (f as { exports: unknown[] }).exports.every(isExportLike)) &&
    Array.isArray(v.deps) &&
    v.deps.every(isDepLike)
  );
}

/** Friendly rate limit text with the local reset time. */
export function rateLimitMessage(resetAt: Date | null, hasToken: boolean): string {
  const when = resetAt
    ? ` Try again at ${resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
    : " Try again later.";
  const tip = hasToken ? "" : " Adding a GitHub token raises the limit to 5,000 requests per hour.";
  return `GitHub rate limit reached.${when}${tip} Or use the built-in sample graveyard.`;
}

function build(snapshot: RepoSnapshot, now: Date) {
  const graveyard = classify(snapshot, now);
  return { repoName: graveyard.repoName, graveyard, layout: layoutGraveyard(graveyard) };
}

const IDLE_RITUAL = {
  ritualPhase: "idle" as RitualPhase,
  ritualId: null,
  ritualProgress: 0,
  ritualPlan: null,
};

const FRESH_SESSION = {
  ...IDLE_RITUAL,
  selectedId: null,
  hoveredId: null,
  resolved: {},
  demoMode: false,
  demoTime: 0,
  demoScript: [] as DemoEvent[],
  demoCaption: "",
  demoShot: null,
  loadError: null,
};

function prefersReduced(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

let shotKey = 0;

export const useStore = create<NecroState>()((set, get) => ({
  ...build(SAMPLE_SNAPSHOT, SAMPLE_NOW),
  ...FRESH_SESSION,
  loading: false,
  panelOpen: false,
  introDone: false,
  quality: "high",
  muted: false,
  reducedMotion: prefersReduced(),

  loadSample: () => set({ ...build(SAMPLE_SNAPSHOT, SAMPLE_NOW), ...FRESH_SESSION, loading: false }),

  loadSnapshot: (snapshot, now) => set({ ...build(snapshot, now), ...FRESH_SESSION, loading: false, panelOpen: false }),

  hasToken: readToken() !== null,
  setToken: (token) => {
    writeToken(token);
    set({ hasToken: readToken() !== null });
  },
  forgetToken: () => {
    clearToken();
    set({ hasToken: false });
  },

  loadFromGithub: async (input, refresh = false) => {
    const ownerRepo = parseRepoInput(input);
    if (!ownerRepo) {
      set({ loadError: "Use owner/name or a github.com URL." });
      return;
    }
    if (!refresh) {
      const cached = readCache(ownerRepo, Date.now());
      if (cached && isSnapshot(cached)) {
        get().loadSnapshot(cached, new Date());
        return;
      }
    }
    set({ loading: true, loadError: null });
    const result = await fetchGithubSnapshot(
      ownerRepo,
      (url, init) => fetch(url, { headers: { Accept: "application/vnd.github+json", ...init?.headers } }),
      new Date(),
      40,
      readToken() ?? undefined,
    );
    if (result.ok) {
      writeCache(ownerRepo, result.snapshot, Date.now());
      get().loadSnapshot(result.snapshot, new Date());
    } else {
      set({ loading: false, loadError: result.rateLimited ? rateLimitMessage(result.resetAt ?? null, get().hasToken) : result.error });
    }
  },

  loadFromJson: (text) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      set({ loadError: "Could not read that file as JSON." });
      return;
    }
    if (!isSnapshot(parsed)) {
      set({ loadError: "That JSON is not a Lenore snapshot (see scripts/scan-repo.mjs)." });
      return;
    }
    try {
      get().loadSnapshot(parsed, new Date());
    } catch (err) {
      set({ loadError: `Could not build a graveyard from that snapshot: ${err instanceof Error ? err.message : String(err)}` });
    }
  },

  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen, loadError: null })),

  select: (id) => {
    const s = get();
    if (s.ritualPhase === "running" || s.ritualPhase === "decision") return;
    set(s.ritualPhase === "resolved" ? { selectedId: id, ...IDLE_RITUAL } : { selectedId: id });
  },

  hover: (id) => set({ hoveredId: id }),

  beginRitual: () => {
    const s = get();
    const id = s.selectedId;
    if (!id || s.ritualPhase === "running" || s.ritualPhase === "decision") return;
    const tomb = s.graveyard.tombstones.find((t) => t.id === id);
    if (!tomb || s.resolved[id]) return;
    set({ ritualPhase: "running", ritualId: id, ritualProgress: 0, ritualPlan: null });
    const accept = (plan: RitualPlan) => {
      const now = get();
      if (now.ritualId === id && now.ritualPhase !== "idle") set({ ritualPlan: plan });
    };
    necromancer.resurrect(tomb).then(accept, () => accept(planRitual(tomb)));
  },

  advanceRitual: (dt) => {
    const s = get();
    if (s.ritualPhase !== "running") return;
    const p = s.ritualProgress + dt / ritualSeconds(s.reducedMotion);
    if (p >= 1 && s.ritualPlan) set({ ritualProgress: 1, ritualPhase: "decision" });
    else set({ ritualProgress: Math.min(p, 0.999) });
  },

  acceptRitual: () => {
    const s = get();
    if (s.ritualPhase !== "decision" || !s.ritualPlan || !s.ritualId) return;
    set({ ritualPhase: "resolved", resolved: { ...s.resolved, [s.ritualId]: s.ritualPlan.verdict } });
  },

  dismissRitual: () => {
    const s = get();
    set(s.ritualPhase === "resolved" ? { ...IDLE_RITUAL, selectedId: null } : IDLE_RITUAL);
  },

  startDemo: () => {
    const s = get();
    const anchors = {
      tombstones: s.layout.tombstones.map((p) => ({ id: p.item.id, pos: p.pos })),
      lanterns: s.layout.lanterns.map((p) => ({ id: p.item.id, pos: p.pos })),
      zombies: s.layout.zombies.map((z) => ({ id: z.id, pos: z.start })),
    };
    set({
      ...IDLE_RITUAL,
      selectedId: null,
      resolved: {},
      panelOpen: false,
      introDone: true,
      demoMode: true,
      demoTime: 0,
      demoScript: buildDemoScript(s.graveyard, anchors),
      demoCaption: "",
      demoShot: null,
    });
  },

  stopDemo: () => set({ demoMode: false, demoCaption: "", demoShot: null, demoTime: 0, ...IDLE_RITUAL }),

  setDemoTime: (t) => set({ demoTime: t }),
  setDemoCaption: (caption) => set({ demoCaption: caption }),
  setDemoShot: (position, target) => set({ demoShot: { key: ++shotKey, position, target } }),

  setIntroDone: () => set({ introDone: true }),
  setQuality: (quality) => set({ quality }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
