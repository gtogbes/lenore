#!/usr/bin/env node
// Scan a local git repo and write a RepoSnapshot JSON for Lenore.
// Usage: node scripts/scan-repo.mjs [repoDir] [outFile] [--offline]
// Dependencies are checked against the npm registry (latest version and deprecation) unless --offline is given
// or the registry cannot be reached, in which case latest mirrors current and no zombies appear.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, resolve, join } from "node:path";

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const positional = args.filter((a) => !a.startsWith("--"));
const repo = resolve(positional[0] ?? ".");
const out = positional[1] ?? "lenore-snapshot.json";
const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|sh)$/;
const paths = git("ls-files").split("\n").filter((p) => p && CODE_RE.test(p) && !/(^|\/)(node_modules|dist|vendor)\//.test(p));

const now = Date.now();
const since = new Date(now - 90 * 86_400_000).toISOString();
const sources = new Map();
for (const p of paths) {
  try {
    sources.set(p, readFileSync(join(repo, p), "utf8"));
  } catch {
    // file listed but unreadable; skip
  }
}

const files = [];
for (const [path, text] of sources) {
  const log = git("log", "-1", "--format=%h%x1f%an%x1f%aI%x1f%s", "--", path).trim();
  if (!log) continue;
  const [sha, author, date, message] = log.split("\x1f");
  const commits90d = git("log", `--since=${since}`, "--format=%h", "--", path).split("\n").filter(Boolean).length;
  const exports = [...text.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|type|interface)\s+([A-Za-z0-9_$]+)/g)].map((m) => ({ name: m[1], usedBy: 0 }));
  const imports = [...text.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
  files.push({
    path,
    loc: text.split("\n").length,
    lastCommit: { sha, message, author, date },
    commits90d,
    imports,
    exports,
    deprecated: /@deprecated|\bDEPRECATED\b/.test(text) || undefined,
  });
}

// Cheap usage count: an export is used if its name appears in any other file.
for (const f of files) {
  for (const e of f.exports) {
    const re = new RegExp(`\\b${e.name.replace(/\$/g, "\\$")}\\b`);
    e.usedBy = files.filter((o) => o !== f && re.test(sources.get(o.path) ?? "")).length;
  }
}

const deps = [];
const pkgPath = join(repo, "package.json");
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const all = { ...pkg.devDependencies, ...pkg.dependencies };
  for (const [name, range] of Object.entries(all)) {
    // Ranges without a leading version ("*", "latest", "workspace:*") are treated as up to date once
    // the registry answers, instead of reading as 0.0.0 and therefore major-behind.
    const hasVersion = /^[\^~<>=v\s]*\d/.test(String(range).trim());
    let current = hasVersion ? String(range).trim().replace(/^[^\d]*/, "") : "0.0.0";
    let latest = current;
    let deprecated = false;
    if (!offline) {
      try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const doc = await res.json();
          if (typeof doc.version === "string") {
            latest = doc.version;
            if (!hasVersion) current = latest;
          }
          deprecated = Boolean(doc.deprecated);
        }
      } catch {
        // registry unreachable: this dependency keeps latest = current
      }
    }
    // The /latest document has no publish date, so lastRelease is the scan time and the 2 year rule cannot fire.
    deps.push({ name, current, latest, lastRelease: new Date(now).toISOString(), deprecated });
  }
}

writeFileSync(out, JSON.stringify({ name: basename(repo), files, deps }, null, 2));
console.log(`Wrote ${files.length} files and ${deps.length} deps to ${out}`);
