import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  readContentRepo,
  writeContentRepoFiles,
  deleteOrphanFiles,
  pathForKey,
} from "@/../scripts/content-sync/lib/content-repo-io.mjs";

const SCHEMA = {
  "home.hero.title": { type: "text", maxLength: 80 },
  "home.feature_one.description": { type: "markdown", maxLength: 600 },
  "layout.footer.copyright": { type: "text", maxLength: 100 },
};

function setupRepo() {
  const dir = mkdtempSync(join(tmpdir(), "cri-"));
  mkdirSync(join(dir, "home"), { recursive: true });
  mkdirSync(join(dir, "layout"), { recursive: true });
  writeFileSync(join(dir, "home", "hero.title.txt"), "Hi there\n");
  writeFileSync(join(dir, "home", "feature_one.description.md"), "Some **markdown**\n");
  writeFileSync(join(dir, "layout", "footer.copyright.txt"), "© 2026\n");
  return dir;
}

describe("content-repo-io", () => {
  it("pathForKey maps key → relative path with the right extension", () => {
    expect(pathForKey("home.hero.title", SCHEMA["home.hero.title"]))
      .toBe("home/hero.title.txt");
    expect(pathForKey("home.feature_one.description", SCHEMA["home.feature_one.description"]))
      .toBe("home/feature_one.description.md");
    expect(pathForKey("layout.footer.copyright", SCHEMA["layout.footer.copyright"]))
      .toBe("layout/footer.copyright.txt");
  });

  it("readContentRepo returns a flat key → value map, trimmed", () => {
    const map = readContentRepo(setupRepo(), SCHEMA);
    expect(map).toEqual({
      "home.hero.title": "Hi there",
      "home.feature_one.description": "Some **markdown**",
      "layout.footer.copyright": "© 2026",
    });
  });

  it("readContentRepo skips keys whose file is missing", () => {
    const schemaWithExtra = { ...SCHEMA, "about.heading": { type: "text", maxLength: 80 } };
    const map = readContentRepo(setupRepo(), schemaWithExtra);
    expect(map["about.heading"]).toBeUndefined();
  });

  it("writeContentRepoFiles creates folders and writes a trailing newline", () => {
    const dir = mkdtempSync(join(tmpdir(), "criw-"));
    writeContentRepoFiles(dir, SCHEMA, [
      { key: "home.hero.title", value: "Hello" },
      { key: "home.feature_one.description", value: "**Bold**" },
    ]);
    expect(readFileSync(join(dir, "home", "hero.title.txt"), "utf8")).toBe("Hello\n");
    expect(readFileSync(join(dir, "home", "feature_one.description.md"), "utf8")).toBe("**Bold**\n");
  });

  it("writeContentRepoFiles overwrites existing files", () => {
    const dir = setupRepo();
    writeContentRepoFiles(dir, SCHEMA, [{ key: "home.hero.title", value: "New" }]);
    expect(readFileSync(join(dir, "home", "hero.title.txt"), "utf8")).toBe("New\n");
  });

  it("deleteOrphanFiles removes content files whose keys left the schema", () => {
    const dir = setupRepo();
    writeFileSync(join(dir, "home", "hero.subtitle.txt"), "Left over\n");

    const deleted = deleteOrphanFiles(dir, SCHEMA);

    expect(deleted).toEqual(["home/hero.subtitle.txt"]);
    expect(existsSync(join(dir, "home", "hero.subtitle.txt"))).toBe(false);
    // Every file that IS in the schema survives.
    expect(existsSync(join(dir, "home", "hero.title.txt"))).toBe(true);
    expect(existsSync(join(dir, "home", "feature_one.description.md"))).toBe(true);
    expect(existsSync(join(dir, "layout", "footer.copyright.txt"))).toBe(true);
  });

  it("deleteOrphanFiles leaves infra and non-content files alone", () => {
    const dir = setupRepo();
    writeFileSync(join(dir, "README.md"), "# Content\n");
    writeFileSync(join(dir, "schema.json"), "{}\n");
    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(join(dir, "scripts", "validate.mjs"), "// noop\n");
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "on-push.yml"), "name: x\n");
    // A page folder can hold a non-content file; only .txt/.md are ours.
    writeFileSync(join(dir, "home", "notes.json"), "{}\n");

    const deleted = deleteOrphanFiles(dir, SCHEMA);

    expect(deleted).toEqual([]);
    expect(existsSync(join(dir, "README.md"))).toBe(true);
    expect(existsSync(join(dir, "schema.json"))).toBe(true);
    expect(existsSync(join(dir, "scripts", "validate.mjs"))).toBe(true);
    expect(existsSync(join(dir, ".github", "workflows", "on-push.yml"))).toBe(true);
    expect(existsSync(join(dir, "home", "notes.json"))).toBe(true);
  });

  it("deleteOrphanFiles ignores nested directories inside a page folder", () => {
    const dir = setupRepo();
    mkdirSync(join(dir, "home", "nested"), { recursive: true });
    writeFileSync(join(dir, "home", "nested", "deep.txt"), "not ours\n");

    const deleted = deleteOrphanFiles(dir, SCHEMA);

    expect(deleted).toEqual([]);
    expect(existsSync(join(dir, "home", "nested", "deep.txt"))).toBe(true);
  });
});
