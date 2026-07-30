import { unflatten } from "./yaml-io.mjs";

/**
 * Pure 3-way merge between content-repo state, yaml state, and a snapshot baseline.
 *
 * Inputs:
 *   - snapshot:     { [key]: string }   — last agreed state (flat)
 *   - contentRepo:  { [key]: string }   — current content-repo state (flat)
 *   - yaml:         nested object       — current content.yaml (will be flattened)
 *   - schemaKeys:   string[]            — the universe of keys to consider
 *
 * Returns:
 *   - newYaml:           nested object (rebuilt from the merged flat map)
 *   - contentRepoWrites: [{ key, value }] keys whose content-repo file should be (re)written
 *   - newSnapshot:       { [key]: string } updated snapshot
 *   - conflicts:         [{ key, snapshotValue, contentRepoValue, yamlValue }]
 */
export function merge({ snapshot, contentRepo, yaml, schemaKeys }) {
  const yamlFlat = flatten(yaml);

  // Seeded from the schema, not from the whole previous snapshot: a key that
  // leaves the schema (renamed, or its last callsite removed) must not keep a
  // baseline entry forever. deleteOrphanFiles already sweeps its content-repo
  // file, so a surviving snapshot entry would be a baseline for a key nothing
  // can edit. A key that leaves and later returns re-bootstraps from yaml,
  // which is what we want.
  const newSnapshot = {};
  for (const key of schemaKeys) {
    if (snapshot[key] !== undefined) newSnapshot[key] = snapshot[key];
  }
  const newYamlFlat = { ...yamlFlat };
  const contentRepoWrites = [];
  const conflicts = [];

  for (const key of schemaKeys) {
    const snap = snapshot[key];
    const repo = contentRepo[key];
    const ya = yamlFlat[key];

    // `readContentRepo` omits keys with no file on disk, so `undefined` here
    // means "not yet materialised" — a new key, or a file a human deleted.
    // The content repo is a projection of the schema: every key must have a
    // file. Absent is NOT "unchanged"; treating it as such is what let a
    // hand-edited snapshot silently skip writing four files and leave the
    // content repo failing its own validation.
    if (repo === undefined) {
      const value = ya ?? snap;
      if (value === undefined) continue;
      contentRepoWrites.push({ key, value });
      newSnapshot[key] = value;
      newYamlFlat[key] = value;
      continue;
    }

    // `repo` is guaranteed defined past the branch above.
    const repoChanged = repo !== snap;
    const yamlChanged = ya !== undefined && ya !== snap;

    if (!repoChanged && !yamlChanged) {
      if (snap === undefined) {
        continue;
      }
      newYamlFlat[key] = snap;
      continue;
    }

    if (repoChanged && !yamlChanged) {
      newYamlFlat[key] = repo;
      newSnapshot[key] = repo;
      continue;
    }

    if (!repoChanged && yamlChanged) {
      contentRepoWrites.push({ key, value: ya });
      newSnapshot[key] = ya;
      continue;
    }

    // Both sides changed.
    if (repo === ya) {
      newSnapshot[key] = repo;
      newYamlFlat[key] = repo;
      continue;
    }

    conflicts.push({
      key,
      snapshotValue: snap ?? null,
      contentRepoValue: repo,
      yamlValue: ya,
    });
    newSnapshot[key] = repo;
  }

  return {
    newYaml: unflatten(newYamlFlat),
    contentRepoWrites,
    newSnapshot,
    conflicts,
  };
}

// Internal helper duplicated from yaml-io.mjs to keep merge.mjs pure
// (importable without dragging in fs/IO).
//
// Trailing whitespace is stripped from every value so that block-scalar
// YAML strings (which include a trailing newline after `yaml.parse`) compare
// equal to the same content read back from the content repo via
// `readContentRepo` (which also strips trailing whitespace). Without this
// normalization, all markdown fields would appear to have diverged on every
// sync because the YAML value ends in `\n` while the file-based value does not.
function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, next));
    } else if (value != null) {
      out[next] = String(value).replace(/\s+$/u, "");
    }
  }
  return out;
}
