#!/usr/bin/env node
// Verifies imports across src/ and tests/:
//  - every relative import resolves to a real file,
//  - every bare package import is declared in package.json (or is a Node builtin),
//  - src/core never imports react, three or @react-three/*,
//  - src/core never reaches outside src/core.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve, relative, sep } from "node:path";

const roots = ["src", "tests"];
const exts = ["", ".ts", ".tsx", ".js", ".mjs", ".json", ".css", "/index.ts", "/index.tsx"];
let bad = 0;

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);
// Optional test-only packages that tests import dynamically inside try/catch.
const optional = new Set(["fast-check"]);
const builtins = new Set(builtinModules);

/** "@scope/name/sub" -> "@scope/name", "three/examples/x.js" -> "three". */
function packageName(spec) {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const coreDir = resolve("src", "core") + sep;

for (const file of roots.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f))) {
  const text = readFileSync(file, "utf8");
  const inCore = resolve(file).startsWith(coreDir);
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    if (spec.startsWith(".")) {
      const target = resolve(dirname(file), spec);
      if (!exts.some((e) => existsSync(target + e) && statSync(target + e).isFile())) {
        console.error(`UNRESOLVED ${file}: ${spec}`);
        bad++;
      } else if (inCore && !(target + sep).startsWith(coreDir) && !target.startsWith(coreDir)) {
        console.error(`FORBIDDEN ${file}: core must not import outside src/core (${relative(".", target)})`);
        bad++;
      }
      continue;
    }
    if (spec.startsWith("node:") || builtins.has(spec)) continue;
    const name = packageName(spec);
    if (inCore && /^(react|three|@react-three)/.test(spec)) {
      console.error(`FORBIDDEN ${file}: core must not import ${spec}`);
      bad++;
    } else if (!declared.has(name) && !optional.has(name)) {
      console.error(`UNDECLARED ${file}: ${spec} is not in package.json`);
      bad++;
    }
  }
}
if (bad) process.exit(1);
console.log("imports ok");
