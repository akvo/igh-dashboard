#!/usr/bin/env node
//
// ONE-TIME SETUP — not part of the live sync.
//
// This script generates the separate content repo from scratch
// (content.yaml + content.schema.json → per-key files, seed schema.json,
// validate.mjs, on-push.yml, README, package.json, .gitignore, then
// git init + first commit). It is invoked manually via
// `npm run content:bootstrap` and is NOT imported or called by the
// running sync (sync.mjs / on-push.yml / content-sync.yml). Once the
// content repo exists, its dev-owned files are maintained in that repo
// directly; only schema.json is re-projected on each sync (export-schema.mjs).
//
// Keep it for repo re-creation: disaster recovery, a rename, a second
// environment, or the pre-go-live "re-bootstrap if content.yaml changed"
// step. It is otherwise inert.
//
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readYamlFile } from "./lib/yaml-io.mjs";
import { writeContentRepoFiles } from "./lib/content-repo-io.mjs";
import { exportSchema } from "./export-schema.mjs";

// ---------------------------------------------------------------
// Templated files written into the new content repo. Declared up
// front because `const` is not hoisted.
// ---------------------------------------------------------------

const VALIDATE_MJS = String.raw`#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const schema = JSON.parse(readFileSync(join(ROOT, "schema.json"), "utf8"));

const ALLOWED_TOP = new Set([
  "README.md", "schema.json", "package.json", "package-lock.json",
  "scripts", ".github", ".git", ".gitignore",
]);

const errors = [];
const warnings = [];

function pathForKey(key, entry) {
  const segments = key.split(".");
  const folder = segments[0];
  const filename = segments.slice(1).join(".");
  const ext = entry.type === "markdown" ? "md" : "txt";
  return join(folder, filename + "." + ext);
}

// 1. Schema-key coverage.
for (const [key, entry] of Object.entries(schema)) {
  const rel = pathForKey(key, entry);
  if (!existsSync(join(ROOT, rel))) {
    errors.push("Missing file for key " + key + ": expected " + rel);
  }
}

// 2 + 3. Per-file checks: extension consistency, maxLength, markdown sanitiser.
for (const [key, entry] of Object.entries(schema)) {
  const rel = pathForKey(key, entry);
  const full = join(ROOT, rel);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8").replace(/\s+$/u, "");
  if (text.length > entry.maxLength) {
    errors.push(rel + ": length " + text.length + " exceeds maxLength " + entry.maxLength);
  }
  if (entry.type === "markdown") {
    if (/<script\b/i.test(text)) errors.push(rel + ": contains <script>");
    if (/\son[a-z]+\s*=/i.test(text)) errors.push(rel + ": contains inline event handler");
  }
}

// 4. Unknown files.
const knownPaths = new Set(Object.entries(schema).map(([k, e]) => pathForKey(k, e)));
function walk(dir, prefix = "") {
  for (const name of readdirSync(dir)) {
    if (prefix === "" && ALLOWED_TOP.has(name)) continue;
    const full = join(dir, name);
    const rel = prefix === "" ? name : prefix + "/" + name;
    if (statSync(full).isDirectory()) {
      walk(full, rel);
    } else if (!knownPaths.has(rel)) {
      warnings.push("Unknown file (not in schema): " + rel);
    }
  }
}
walk(ROOT);

for (const w of warnings) console.warn("WARN " + w);
for (const e of errors) console.error("ERROR " + e);

if (errors.length > 0) process.exit(1);
console.log("OK — " + Object.keys(schema).length + " keys validated");
`;

const ON_PUSH_YML = `name: Validate and dispatch
on:
  push:
    branches: [main]

concurrency:
  group: validate-and-dispatch
  cancel-in-progress: false

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci || npm install
      - name: Validate content files
        run: npm run validate
      - name: Dispatch sync to dashboard repo
        env:
          GH_TOKEN: \${{ secrets.DASHBOARD_DISPATCH_TOKEN }}
        run: |
          gh api repos/akvo/igh-dashboard/dispatches \\
            -X POST \\
            -f event_type=content-updated \\
            -F client_payload[commit]=\${{ github.sha }}
`;

const README_MD = `# IGH Dashboard — Content Repo

This repo holds the editable text for the IGH dashboard. Each piece
of copy lives as its own file, organised by page-folder.

## Editing content

1. Find the page folder for the screen you want to edit
   (\`home/\`, \`analytical_insights/\`, \`portfolio_analysis/\`,
   \`cross_pipeline_analytics/\`, \`who_priority/\`, or \`layout/\`).
2. Click into the file for the specific text. Filenames preserve the
   dotted key (e.g. \`hero.title.txt\`).
3. Click the pencil icon (top-right of the file view).
4. Edit the text.
5. Scroll down, write a short commit message (optional but
   encouraged), and click "Commit changes" → "Commit directly to the
   \`main\` branch".

The staging dashboard updates within ~1 minute.

## When something doesn't update

1. Open this repo's **Actions** tab.
2. If the most recent run has a red X, click into it — the error
   tells you what's wrong (usually a length limit or the wrong file
   extension for a markdown key).
3. Fix the file (edit + commit again). The next run publishes if it
   passes.

If the run is green but staging still hasn't updated, ask a developer
to trigger \`workflow_dispatch\` on the dashboard repo's
\`content-sync.yml\`.

## File extensions

- \`.txt\` — plain text.
- \`.md\` — markdown, rendered as formatted text on the site.

The expected extension for each key is defined in \`schema.json\` —
**do not edit \`schema.json\`**; it's managed by the sync bot.

## What NOT to edit

Managed by the dev team or automated scripts; the next sync will
overwrite changes to these:

- \`schema.json\`
- \`package.json\`, \`package-lock.json\`
- Anything under \`scripts/\`
- Anything under \`.github/\`
`;

// ---------------------------------------------------------------
// Bootstrap procedure.
// ---------------------------------------------------------------

const siteRoot = process.cwd();
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => (a.startsWith("--") ? a.slice(2).split("=") : [a, true])),
);
const target = resolve(args.target ?? "../igh-dashboard-content");

if (existsSync(join(target, ".git"))) {
  console.error(`Target ${target} already contains a git repo. Aborting.`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });

const schema = JSON.parse(readFileSync(join(siteRoot, "src/content/content.schema.json"), "utf8"));
const yaml = readYamlFile(join(siteRoot, "src/content/content.yaml"));

const flat = {};
(function flatten(o, p = "") {
  for (const [k, v] of Object.entries(o ?? {})) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key);
    else flat[key] = String(v);
  }
})(yaml);

writeContentRepoFiles(target, schema, Object.entries(flat).map(([key, value]) => ({ key, value })));
exportSchema(siteRoot, target);

writeFileSync(join(target, "package.json"), JSON.stringify({
  name: "igh-dashboard-content",
  version: "0.1.0",
  private: true,
  type: "module",
  scripts: { validate: "node scripts/validate.mjs" },
}, null, 2) + "\n");

mkdirSync(join(target, "scripts"), { recursive: true });
writeFileSync(join(target, "scripts", "validate.mjs"), VALIDATE_MJS);

mkdirSync(join(target, ".github", "workflows"), { recursive: true });
writeFileSync(join(target, ".github", "workflows", "on-push.yml"), ON_PUSH_YML);

writeFileSync(join(target, "README.md"), README_MD);

// Keep a stray local `npm install` from getting staged by a later sync's
// `git add .`. validate.mjs whitelists .gitignore as an allowed top file.
writeFileSync(join(target, ".gitignore"), "node_modules/\n");

execFileSync("git", ["init", "-b", "main"], { cwd: target, stdio: "inherit" });
execFileSync("git", ["add", "-A"], { cwd: target, stdio: "inherit" });
execFileSync("git", ["commit", "-m", "Initial content from dashboard bootstrap"], { cwd: target, stdio: "inherit" });

console.log("");
console.log(`Bootstrapped at ${target}`);
console.log("Next steps:");
console.log("  1. Create the GitHub repo: github.com/akvo/igh-dashboard-content");
console.log(`  2. cd ${target}`);
console.log("  3. git remote add origin https://github.com/akvo/igh-dashboard-content.git");
console.log("  4. git push -u origin main");
console.log("  5. Add the DASHBOARD_DISPATCH_TOKEN secret in the new repo's settings.");
