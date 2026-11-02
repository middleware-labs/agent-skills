#!/usr/bin/env node
// Checks that every public API endpoint cited in skills/ as `METHOD /path` is in
// the live OpenAPI spec. Catches renamed or removed endpoints.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SPEC = "https://app.middleware.io/swagger.json";
// Verified against a live project but not published yet. The script warns once
// one of these appears in the spec, so the exception can be removed.
const UNPUBLISHED = new Set(["POST /agent/setting/{}"]);

const root = join(import.meta.dirname, "..", "skills");
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".md")) files.push(p);
  }
};
walk(root);

// Parameter names don't matter for matching: /a/{x} and /a/{y} are the same route.
const normalize = (path) =>
  path.replace(/^\/api\/v1(?=\/)/, "").split("?")[0].replace(/\{[^}]*\}/g, "{}").replace(/\/$/, "");

const cited = new Map(); // "METHOD /path" -> [file, ...]
for (const f of files) {
  for (const m of readFileSync(f, "utf8").matchAll(/`(GET|POST|PUT|PATCH|DELETE) (\/[^`\s]*)`?/g)) {
    if (m[2].includes("...")) continue; // shorthand, e.g. /agent/setting/rm/...
    const key = `${m[1]} ${normalize(m[2])}`;
    if (!cited.has(key)) cited.set(key, []);
    cited.get(key).push(f.slice(root.length + 1));
  }
}

const res = await fetch(SPEC);
if (!res.ok) {
  console.error(`::error::could not fetch ${SPEC}: HTTP ${res.status}`);
  process.exit(1);
}
const published = new Set();
for (const [path, ops] of Object.entries((await res.json()).paths)) {
  for (const method of Object.keys(ops)) published.add(`${method.toUpperCase()} ${normalize(path)}`);
}

const problems = [];
for (const [key, where] of cited) {
  if (published.has(key)) {
    if (UNPUBLISHED.has(key)) console.log(`::warning::${key} is now in the spec. Remove it from UNPUBLISHED and update the skill references.`);
  } else if (!UNPUBLISHED.has(key)) {
    problems.push(`${key} is not in the spec (cited in ${[...new Set(where)].join(", ")})`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  console.error(`\n${problems.length} API endpoint problem(s). Check ${SPEC}.`);
  process.exit(1);
}
console.log(`✓ ${cited.size} cited API endpoints checked against the spec (${published.size} operations published)`);
