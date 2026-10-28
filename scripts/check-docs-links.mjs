#!/usr/bin/env node
// Checks that every docs.middleware.io page cited in skills/ is still published:
// each `https://docs.middleware.io/<path>.md` URL must appear in the live
// https://docs.middleware.io/llms.txt index. Catches moved or removed pages.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const INDEX = "https://docs.middleware.io/llms.txt";
// Docs endpoints that are not pages, and placeholder URLs used in instructions.
const ALLOW = new Set([
  "https://docs.middleware.io/llms.txt",
  "https://docs.middleware.io/llms-full.txt",
  "https://docs.middleware.io/<path", // placeholder `<path>.md` (regex stops at ">")
]);

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

const cited = new Map(); // url -> [file, ...]
for (const f of files) {
  for (const m of readFileSync(f, "utf8").matchAll(/https:\/\/docs\.middleware\.io[^\s)`"*>,\]]*/g)) {
    const url = m[0].replace(/[.:;]+$/, "").split("#")[0];
    if (!cited.has(url)) cited.set(url, []);
    cited.get(url).push(f.slice(root.length + 1));
  }
}

const res = await fetch(INDEX);
if (!res.ok) {
  console.error(`::error::could not fetch ${INDEX}: HTTP ${res.status}`);
  process.exit(1);
}
const index = await res.text();
const published = new Set([...index.matchAll(/\((https:\/\/docs\.middleware\.io\/[^)\s]+)\)/g)].map((m) => m[1]));

const problems = [];
for (const [url, where] of cited) {
  if (ALLOW.has(url)) continue;
  if (!url.endsWith(".md")) problems.push(`${url} is not a .md page URL (cited in ${where.join(", ")})`);
  else if (!published.has(url)) problems.push(`${url} is not listed in llms.txt (cited in ${where.join(", ")})`);
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  console.error(`\n${problems.length} docs link problem(s). Find the current page in ${INDEX}.`);
  process.exit(1);
}
console.log(`✓ ${cited.size} cited docs URLs are published in llms.txt (${published.size} pages indexed)`);
