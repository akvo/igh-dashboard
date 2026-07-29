import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

/**
 * Translate a dotted content key + its schema entry into the
 * relative path used inside the content repo. First segment is the
 * page folder; remaining segments stay dotted in the filename.
 */
export function pathForKey(key, schemaEntry) {
  const segments = key.split(".");
  if (segments.length < 2) {
    throw new Error(`Key must have at least two segments: ${key}`);
  }
  const folder = segments[0];
  const filename = segments.slice(1).join(".");
  const ext = schemaEntry.type === "markdown" ? "md" : "txt";
  return `${folder}/${filename}.${ext}`;
}

/**
 * Read the on-disk content repo into a flat key → value map.
 * Files are trimmed of trailing whitespace so newline differences
 * between editor commits don't manifest as spurious diffs.
 */
export function readContentRepo(repoPath, schema) {
  const out = {};
  for (const [key, entry] of Object.entries(schema)) {
    const file = join(repoPath, pathForKey(key, entry));
    if (!existsSync(file)) continue;
    out[key] = readFileSync(file, "utf8").replace(/\s+$/u, "");
  }
  return out;
}

/**
 * Write a list of [{ key, value }] entries into the content repo,
 * creating parent folders as needed. Always ends each file with a
 * single trailing newline so GitHub's web editor doesn't churn it.
 */
export function writeContentRepoFiles(repoPath, schema, writes) {
  for (const { key, value } of writes) {
    const entry = schema[key];
    if (!entry) throw new Error(`Unknown schema key: ${key}`);
    const file = join(repoPath, pathForKey(key, entry));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, value.replace(/\s+$/u, "") + "\n");
  }
}

// Folders at the top of the content repo that hold tooling rather than
// content. Everything else at that level is a page folder owned by sync.
// `.git` and `.github` are already caught by the dot-directory check below;
// they're kept here only as documentation of what's excluded and why.
const INFRA_TOP = new Set([".git", ".github", "scripts", "node_modules"]);

/**
 * Delete content files whose schema key no longer exists — the leftovers of a
 * key being renamed or removed in content.yaml.
 *
 * Orphans are found by sweeping the filesystem against the schema rather than
 * by diffing against the previous snapshot. Snapshot drift only ever deletes
 * files sync itself created, which is safer, but it misses orphans left behind
 * when the snapshot is edited by hand — exactly the case that produced the
 * current stale files.
 *
 * This sweep is related to, but not equivalent to, the content repo's own
 * scripts/validate.mjs: validate.mjs recurses into nested directories, this
 * sweep is deliberately one level deep; validate.mjs warns on any unknown
 * file, this sweep only touches .txt/.md; and validate.mjs's ALLOWED_TOP list
 * (README.md, schema.json, package.json, package-lock.json, scripts, .github,
 * .git, .gitignore — a mix of files and directories, missing node_modules)
 * differs from INFRA_TOP above. Net effect: this sweep guarantees
 * validate.mjs's `ERROR Missing file` never fires and clears the
 * `WARN Unknown file` cases within its scope, but validate.mjs still warns on
 * a strictly larger set of files than this sweep touches.
 *
 * The cost of that choice: sync is authoritative over page folders, so a
 * scratch .txt parked next to real content will be deleted.
 *
 * Returns the repo-relative paths deleted.
 */
export function deleteOrphanFiles(repoPath, schema) {
  const known = new Set(Object.entries(schema).map(([k, e]) => pathForKey(k, e)));
  const deleted = [];
  for (const folder of readdirSync(repoPath, { withFileTypes: true })) {
    // A dot-directory (e.g. an untracked `.claude/`) can never be a
    // legitimate page folder — those come from the first segment of dotted
    // yaml keys, which never start with a dot — so skip it before consulting
    // INFRA_TOP.
    if (!folder.isDirectory() || folder.name.startsWith(".") || INFRA_TOP.has(folder.name)) continue;
    for (const file of readdirSync(join(repoPath, folder.name), { withFileTypes: true })) {
      // pathForKey always yields exactly `folder/filename.ext`, so content
      // never nests deeper than one level and there is nothing to recurse into.
      if (!file.isFile() || !/^.+\.(txt|md)$/i.test(file.name)) continue;
      const rel = `${folder.name}/${file.name}`;
      if (known.has(rel)) continue;
      unlinkSync(join(repoPath, rel));
      deleted.push(rel);
    }
  }
  return deleted;
}
