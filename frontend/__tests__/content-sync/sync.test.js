import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { runSync } from "@/../scripts/content-sync/sync.mjs";

// __tests__/content-sync/ → ../.. is the frontend root, where
// src/content/* lives.
const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

beforeAll(() => { process.env.SYNC_SKIP_PUSH = "1"; });

function freshSite() {
  const dir = mkdtempSync(join(tmpdir(), "sync-site-"));
  mkdirSync(join(dir, "src/content"), { recursive: true });
  copyFileSync(
    join(FRONTEND_ROOT, "src/content/content.schema.json"),
    join(dir, "src/content/content.schema.json"),
  );
  writeFileSync(join(dir, "src/content/content.snapshot.json"), "{}\n");
  writeFileSync(
    join(dir, "src/content/content.conflicts.json"),
    JSON.stringify({ createdAt: null, entries: [] }, null, 2) + "\n",
  );
  return dir;
}

function gitInit(dir) {
  execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@e.st"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "ignore" });
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else if (v != null) out[key] = String(v);
  }
  return out;
}

function seedContentRepo(values) {
  const dir = mkdtempSync(join(tmpdir(), "sync-content-"));
  const schema = JSON.parse(
    readFileSync(join(FRONTEND_ROOT, "src/content/content.schema.json"), "utf8"),
  );
  for (const [key, value] of Object.entries(values)) {
    const segments = key.split(".");
    const folder = segments[0];
    const filename = segments.slice(1).join(".");
    const ext = schema[key].type === "markdown" ? "md" : "txt";
    mkdirSync(join(dir, folder), { recursive: true });
    writeFileSync(join(dir, folder, `${filename}.${ext}`), value + "\n");
  }
  gitInit(dir);
  return dir;
}

describe("orchestrator — happy path", () => {
  it("absorbs a content-repo edit into content.yaml + snapshot", async () => {
    const site = freshSite();
    const initialYaml = readFileSync(join(FRONTEND_ROOT, "src/content/content.yaml"), "utf8");
    writeFileSync(join(site, "src/content/content.yaml"), initialYaml);
    const flat = flatten(parseYaml(initialYaml));
    writeFileSync(
      join(site, "src/content/content.snapshot.json"),
      JSON.stringify(flat, null, 2) + "\n",
    );
    gitInit(site);

    // Pick any existing key to mutate on the content side.
    const someKey = Object.keys(flat)[0];
    const seed = { ...flat, [someKey]: "Edited via web UI" };
    const content = seedContentRepo(seed);

    await runSync({ siteRoot: site, contentRepoPath: content });

    const yamlAfter = readFileSync(join(site, "src/content/content.yaml"), "utf8");
    expect(yamlAfter).toContain("Edited via web UI");
    const snap = JSON.parse(readFileSync(join(site, "src/content/content.snapshot.json"), "utf8"));
    expect(snap[someKey]).toBe("Edited via web UI");
  });
});

describe("orchestrator — conflict path", () => {
  it("writes conflicts.json, bumps snapshot, rolls content.yaml back", async () => {
    const site = freshSite();
    const initialYaml = readFileSync(join(FRONTEND_ROOT, "src/content/content.yaml"), "utf8");
    const flat = flatten(parseYaml(initialYaml));
    const someKey = Object.keys(flat)[0];
    const agreed = flat[someKey];

    // Yaml side moved to a new value; rebuild yaml with someKey changed.
    const yamlFlat = { ...flat, [someKey]: "Yaml-side change" };
    writeFileSync(
      join(site, "src/content/content.yaml"),
      Object.entries(yamlFlat)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n") + "\n",
    );
    // Snapshot reflects the ORIGINAL agreed value.
    writeFileSync(
      join(site, "src/content/content.snapshot.json"),
      JSON.stringify({ [someKey]: agreed }, null, 2) + "\n",
    );
    gitInit(site);

    // Content side moved to a different new value.
    const seed = { ...flat, [someKey]: "Content-side change" };
    const content = seedContentRepo(seed);

    await runSync({ siteRoot: site, contentRepoPath: content });

    const conflicts = JSON.parse(
      readFileSync(join(site, "src/content/content.conflicts.json"), "utf8"),
    );
    expect(conflicts.entries).toHaveLength(1);
    expect(conflicts.entries[0]).toMatchObject({
      key: someKey,
      snapshotValue: agreed,
      contentRepoValue: "Content-side change",
      yamlValue: "Yaml-side change",
    });

    const snap = JSON.parse(
      readFileSync(join(site, "src/content/content.snapshot.json"), "utf8"),
    );
    // Snapshot bumped to the content-repo side.
    expect(snap[someKey]).toBe("Content-side change");

    // content.yaml's conflicting key rolled back to the agreed value;
    // the yaml-side edit must NOT remain live.
    const yamlAfter = readFileSync(join(site, "src/content/content.yaml"), "utf8");
    expect(yamlAfter).toContain(agreed);
    expect(yamlAfter).not.toContain("Yaml-side change");
  });

  it("the gate halts further syncs while conflicts are active", async () => {
    const site = freshSite();
    const yamlText = readFileSync(join(FRONTEND_ROOT, "src/content/content.yaml"), "utf8");
    writeFileSync(join(site, "src/content/content.yaml"), yamlText);
    writeFileSync(
      join(site, "src/content/content.conflicts.json"),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        entries: [
          { key: "home.hero.title", snapshotValue: "A", contentRepoValue: "B", yamlValue: "C" },
        ],
      }, null, 2) + "\n",
    );
    gitInit(site);

    const content = seedContentRepo({ "home.hero.title": "anything" });
    await runSync({ siteRoot: site, contentRepoPath: content });

    const conflicts = JSON.parse(
      readFileSync(join(site, "src/content/content.conflicts.json"), "utf8"),
    );
    expect(conflicts.entries).toHaveLength(1);
    expect(readFileSync(join(site, "src/content/content.yaml"), "utf8")).toBe(yamlText);
  });
});

describe("orchestrator — content-repo materialisation", () => {
  it("creates files for schema keys the content repo lacks and deletes orphans", async () => {
    const site = freshSite();
    const initialYaml = readFileSync(join(FRONTEND_ROOT, "src/content/content.yaml"), "utf8");
    writeFileSync(join(site, "src/content/content.yaml"), initialYaml);
    const flat = flatten(parseYaml(initialYaml));
    // Snapshot agrees with yaml on every key — the state a hand-edit produces.
    writeFileSync(
      join(site, "src/content/content.snapshot.json"),
      JSON.stringify(flat, null, 2) + "\n",
    );
    gitInit(site);

    // Seed every key EXCEPT one. With yaml === snapshot for that key and no
    // file on disk, the old merge wrote nothing and the content repo was left
    // holding a schema key with no file.
    const missingKey = Object.keys(flat)[0];
    const seed = { ...flat };
    delete seed[missingKey];
    const content = seedContentRepo(seed);

    // A content-shaped file with no schema key, i.e. a renamed key's leftover.
    const pageFolder = missingKey.split(".")[0];
    mkdirSync(join(content, pageFolder), { recursive: true });
    writeFileSync(join(content, pageFolder, "gone.key.txt"), "stale\n");

    await runSync({ siteRoot: site, contentRepoPath: content });

    // The absent file was materialised from the agreed value.
    const schema = JSON.parse(
      readFileSync(join(FRONTEND_ROOT, "src/content/content.schema.json"), "utf8"),
    );
    const segments = missingKey.split(".");
    const ext = schema[missingKey].type === "markdown" ? "md" : "txt";
    const materialised = join(content, segments[0], `${segments.slice(1).join(".")}.${ext}`);
    expect(existsSync(materialised)).toBe(true);
    expect(readFileSync(materialised, "utf8").trimEnd()).toBe(flat[missingKey].trimEnd());

    // The orphan is gone.
    expect(existsSync(join(content, pageFolder, "gone.key.txt"))).toBe(false);

    // Nothing else in the ~358 other seeded files was collateral damage from
    // the sweep — this is the assertion that would catch a regression in
    // known.has(rel) or pathForKey.
    const missing = Object.keys(seed).filter((key) => {
      const segs = key.split(".");
      const keyExt = schema[key].type === "markdown" ? "md" : "txt";
      const path = join(content, segs[0], `${segs.slice(1).join(".")}.${keyExt}`);
      return !existsSync(path);
    });
    expect(missing).toEqual([]);
  });
});

describe("orchestrator — schema guard", () => {
  it("rejects when the schema has no keys", async () => {
    const site = freshSite();
    writeFileSync(join(site, "src/content/content.schema.json"), "{}\n");

    await expect(runSync({ siteRoot: site, contentRepoPath: "/nonexistent" }))
      .rejects.toThrow(/has no keys/);
  });
});
