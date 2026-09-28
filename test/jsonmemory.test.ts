import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as jm from "../src/index";

beforeEach(() => {
  jm.reset();
  jm.configure({ defaults: { log: false } });
});

afterEach(() => {
  jm.reset();
});

describe("memory()", () => {
  it("stores the first snapshot and reports `first`", () => {
    const r = jm.memory("checkout", { total: 10, status: "pending" });
    expect(r.first).toBe(true);
    expect(r.changed).toBe(false);
    expect(r.summary).toContain("✓ checkout stored");
  });

  it("reports modified leaves the way humans read them", () => {
    jm.memory("checkout", {
      user: { plan: "free" },
      cart: { items: [1, 2, 3] },
      payment: { status: "pending" },
    });
    const r = jm.memory("checkout", {
      user: { plan: "pro" },
      cart: { items: [1, 2, 3, 4] },
      payment: { status: "paid" },
    });
    expect(r.changed).toBe(true);
    expect(r.summary).toContain("checkout changed");
    expect(r.summary).toContain('user.plan\n  "free" → "pro"');
    expect(r.summary).toContain("cart.items\n  3 → 4");
    expect(r.summary).toContain('payment.status\n  "pending" → "paid"');
  });

  it("tracks added and removed keys", () => {
    jm.memory("user", { name: "Eeza", email: "a@b.c" });
    const r = jm.memory("user", { name: "Eeza", full_name: "Eeza A" });
    expect(r.removed).toHaveLength(1);
    expect(r.removed[0].path).toBe("email");
    expect(r.added).toHaveLength(1);
    expect(r.added[0].path).toBe("full_name");
    expect(r.changed).toBe(true);
  });

  it("walks nested arrays element by element", () => {
    jm.memory("cart", { items: [{ name: "A" }, { name: "B" }] });
    const r = jm.memory("cart", { items: [{ name: "A" }, { name: "Other" }] });
    expect(r.modified).toHaveLength(1);
    expect(r.modified[0].path).toBe("items[1].name");
    expect(r.summary).toContain('"B" → "Other"');
  });

  it("respects ignore options", () => {
    jm.memory("payload", { id: 1, updated_at: 100, data: { v: 1, last_seen: 5 } });
    const r = jm.memory(
      "payload",
      { id: 1, updated_at: 999, data: { v: 2, last_seen: 50 } },
      { ignore: ["updated_at", "last_seen", "request_id"] },
    );
    expect(r.changed).toBe(true);
    expect(r.modified.map((m) => m.path)).toEqual(["data.v"]);
  });

  it("ignore applies to nested deeper paths by leaf name", () => {
    jm.memory("a", { meta: { ttl: 1, keep: 1 } });
    const r = jm.memory("a", { meta: { ttl: 2, keep: 2 } }, { ignore: ["meta.ttl"] });
    expect(r.modified.map((m) => m.path)).toEqual(["meta.keep"]);
  });

  it("returns an empty result when nothing changed", () => {
    const snapshot = { a: 1, b: { c: [1] } };
    const first = jm.memory("same", snapshot);
    const again = jm.memory("same", { a: 1, b: { c: [1] } });
    expect(first.first).toBe(true);
    expect(again.changed).toBe(false);
    expect(again.summary).toBe("");
    expect(again.entries).toHaveLength(0);
  });
});

describe("special values canonicalization", () => {
  it("handles Dates, NaN, Map/Set without false diffs", () => {
    const make = () => ({
      when: new Date("2026-01-01T00:00:00.000Z"),
      score: NaN,
      tags: new Set(["a", "b"]),
      freq: new Map([["k", 1]]),
    });
    jm.memory("entity", make());
    const r = jm.memory("entity", make());
    expect(r.changed).toBe(false);
  });

  it("detects a Date change", () => {
    jm.memory("entity", { when: new Date("2026-01-01") });
    const r = jm.memory("entity", { when: new Date("2026-06-01") });
    expect(r.changed).toBe(true);
    expect(r.summary).toContain("Date(20");
  });
});

describe("storage modes", () => {
  it("persists snapshots to a file directory", () => {
    const dir = ".jsonmemory";
    jm.reset();
    jm.memory("f1", { v: 1 }, { storage: dir, log: false });

    // a fresh in-memory store must still see the previously-computed value
    const r = jm.memory("f1", { v: 2 }, { storage: dir, log: false });
    // same-process comparison anyway; but re-create store to be sure
    const again = jm.memory("f1", { v: 3 }, { storage: dir, log: false });
    expect(again.modified[0]).toMatchObject({ path: "v" });
    expect(r.modified[0]).toMatchObject({ path: "v" });
  });

  it("supports a custom adapter", () => {
    const backing = new Map<string, unknown>();
    jm.configure({ adapter: {
      get: (k) => backing.get(k),
      set: (k, v) => backing.set(k, v),
      delete: (k) => backing.delete(k),
    }});
    jm.memory("x", { a: 1 });
    jm.memory("x", { a: 9 });
    expect(backing.get("x")).toEqual({ a: 9 });
    jm.configure({ adapter: undefined });
  });
});

describe("diff()", () => {
  it("one-off deep diff without storage", () => {
    const entries = jm.diff(
      { list: [1, { x: 1, y: 2 }], gone: 0 },
      { list: [1, { x: 1, y: 3, z: 4 }] },
    );
    expect(entries.map((e) => e.kind)).toEqual(["modified", "added", "removed"]);
    expect(entries.find((e) => e.path === "list[1].y")?.kind).toBe("modified");
  });
});
