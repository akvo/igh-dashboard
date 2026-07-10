import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportSchema } from "@/../scripts/content-sync/export-schema.mjs";

describe("exportSchema", () => {
  it("writes a sorted flat schema.json into the content repo path", () => {
    const siteRoot = mkdtempSync(join(tmpdir(), "es-site-"));
    mkdirSync(join(siteRoot, "src/content"), { recursive: true });
    writeFileSync(
      join(siteRoot, "src/content/content.schema.json"),
      JSON.stringify({
        "home.hero.title": { type: "text", maxLength: 80 },
        "about.intro": { type: "text", maxLength: 300 },
      }),
    );
    const contentRepo = mkdtempSync(join(tmpdir(), "es-content-"));

    exportSchema(siteRoot, contentRepo);

    const out = readFileSync(join(contentRepo, "schema.json"), "utf8");
    // Sorted by key → about.intro first.
    expect(out.indexOf("about.intro")).toBeLessThan(out.indexOf("home.hero.title"));
    expect(JSON.parse(out)["home.hero.title"]).toEqual({ type: "text", maxLength: 80 });
  });
});
