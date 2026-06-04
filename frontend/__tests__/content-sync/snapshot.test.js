import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSnapshot, writeSnapshot } from "@/../scripts/content-sync/lib/snapshot.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "snap-"));
}

describe("snapshot", () => {
  it("returns {} when the file does not exist", () => {
    expect(readSnapshot(join(tmp(), "missing.json"))).toEqual({});
  });

  it("returns {} when the file is empty / whitespace", () => {
    const p = join(tmp(), "snap.json");
    writeFileSync(p, "");
    expect(readSnapshot(p)).toEqual({});
  });

  it("reads a populated snapshot", () => {
    const p = join(tmp(), "snap.json");
    writeFileSync(p, JSON.stringify({ "a.b": "x", "c.d": "y" }));
    expect(readSnapshot(p)).toEqual({ "a.b": "x", "c.d": "y" });
  });

  it("writes a stable, sorted JSON", () => {
    const p = join(tmp(), "snap.json");
    writeSnapshot(p, { "c.d": "y", "a.b": "x" });
    expect(readFileSync(p, "utf8")).toBe(
      "{\n  \"a.b\": \"x\",\n  \"c.d\": \"y\"\n}\n",
    );
  });

  it("round-trips", () => {
    const p = join(tmp(), "snap.json");
    const input = { foo: "bar", baz: "qux" };
    writeSnapshot(p, input);
    expect(existsSync(p)).toBe(true);
    expect(readSnapshot(p)).toEqual(input);
  });
});
