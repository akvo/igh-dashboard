import { describe, expect, it } from "vitest";
import { applyChoices } from "@/../scripts/content-sync/lib/resolve-core.mjs";

describe("applyChoices", () => {
  it("rewrites nested yaml values for each chosen key", () => {
    const yaml = { home: { hero: { title: "Old", subtitle: "Sub" } } };
    const out = applyChoices(yaml, { "home.hero.title": "New title" });
    expect(out).toEqual({ home: { hero: { title: "New title", subtitle: "Sub" } } });
  });

  it("creates intermediate nested keys when missing", () => {
    const out = applyChoices({ home: {} }, { "home.hero.title": "X" });
    expect(out).toEqual({ home: { hero: { title: "X" } } });
  });

  it("does not mutate the input yaml object", () => {
    const yaml = { home: { hero: { title: "Old" } } };
    const out = applyChoices(yaml, { "home.hero.title": "New" });
    expect(yaml.home.hero.title).toBe("Old");
    expect(out.home.hero.title).toBe("New");
  });

  it("returns the input unchanged when there are no choices", () => {
    expect(applyChoices({ a: { b: "c" } }, {})).toEqual({ a: { b: "c" } });
  });
});
