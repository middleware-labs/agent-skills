#!/usr/bin/env node
// Validates every skills/<name>/SKILL.md: frontmatter shape, naming, and that
// every `references/<file>.md` mentioned in a skill exists inside that skill.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "skills");
const errors = [];
const err = (skill, msg) => errors.push(`${skill}: ${msg}`);

const skills = readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());
if (skills.length === 0) errors.push("no skills found under skills/");

for (const dir of skills) {
  const file = join(root, dir, "SKILL.md");
  if (!existsSync(file)) { err(dir, "missing SKILL.md"); continue; }
  const text = readFileSync(file, "utf8");

  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { err(dir, "missing YAML frontmatter"); continue; }
  const field = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim();

  const name = field("name");
  if (!name) err(dir, "frontmatter `name` is required");
  else {
    if (name !== dir) err(dir, `name "${name}" must match directory name`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64)
      err(dir, "name must be kebab-case, max 64 chars");
  }

  const description = field("description");
  if (!description) err(dir, "frontmatter `description` is required");
  else {
    if (description.length > 1024) err(dir, `description is ${description.length} chars (max 1024)`);
    if (/[<>]/.test(description)) err(dir, "description must not contain < or >");
  }

  if (!/^\s+version:\s*"?\d+\.\d+\.\d+"?$/m.test(fm[1])) err(dir, "metadata.version (semver) is required");

  const body = text.slice(fm[0].length);
  if (!body.trim()) err(dir, "SKILL.md body is empty");

  // Only same-skill references: `references/foo.md` not preceded by another skill dir.
  for (const m of body.matchAll(/(?<![\w/-])references\/([\w.-]+\.md)/g)) {
    if (!existsSync(join(root, dir, "references", m[1]))) err(dir, `referenced file references/${m[1]} does not exist`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ ${skills.length} skills valid: ${skills.join(", ")}`);
