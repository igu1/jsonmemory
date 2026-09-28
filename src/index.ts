import * as fs from "node:fs";
import * as path from "node:path";
import { canonical } from "./canonical";
import { deepDiff } from "./diff";
import { formatSummary } from "./format";
import type { ChangeEntry, JsonMemoryConfig, MemoryAdapter, MemoryOptions, MemoryResult } from "./types";
// ---------------------------------------------------------------- storage ---

const memoryStore = new Map<string, unknown>();

const memoryAdapter: MemoryAdapter = {
  get: (label) => memoryStore.get(label),
  set: (label, value) => {
    memoryStore.set(label, value);
  },
  delete: (label) => {
    memoryStore.delete(label);
  },
};

function makeFileAdapter(dir: string): MemoryAdapter {
  const file = path.resolve(process.cwd(), dir, "memory.json");
  const read = (): Record<string, unknown> => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  const write = (data: Record<string, unknown>) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  return {
    get: (label) => read()[label],
    set: (label, value) => {
      const data = read();
      data[label] = value;
      write(data);
    },
    delete: (label) => {
      const data = read();
      delete data[label];
      write(data);
    },
    clearAll: () => {
      write({});
    },
  };
}

// ------------------------------------------------------------ public API ---

let defaults: MemoryOptions = {};
let configuredAdapter: MemoryAdapter | undefined;

/** Set default options or plug in a custom storage adapter. */
export function configure(config: JsonMemoryConfig = {}) {
  if (config.defaults) defaults = { ...defaults, ...config.defaults };
  if (config.adapter) configuredAdapter = config.adapter;
}

/** Point `memory()`'s default storage at a directory (keys live in memory.json). */
export function useStorage(storage: "memory" | string): void {
  configuredAdapter = storage === "memory" ? memoryAdapter : makeFileAdapter(storage as string);
}

function resolveStore(opts: MemoryOptions): MemoryAdapter {
  if (opts.storage === "memory") return memoryAdapter;
  if (typeof opts.storage === "string" && opts.storage.length > 0) {
    return makeFileAdapter(opts.storage);
  }
  return configuredAdapter ?? memoryAdapter;
}

/** Drop one snapshot, or every snapshot when called without arguments. */
export function reset(label?: string): void {
  const store = resolveStore({ ...defaults });
  if (label === undefined) {
    // clearing everything only applies to the in-memory store (files are explicit)
    memoryStore.clear();
    if (store === memoryAdapter) return;
    if (store === configuredAdapter && store.clearAll) store.clearAll();
  } else {
    store.delete(label);
  }
}

/**
 * Remember `data` under `label`; the next call with new data reports
 * exactly what changed:
 *
 * ```ts
 * memory("checkout", data);      //  ✓ checkout stored
 * memory("checkout", updated);   //  prints + returns what changed
 * ```
 */
export function memory(label: string, data: unknown, options: MemoryOptions = {}): MemoryResult {
  const opts: MemoryOptions = { ...defaults, ...options };
  const store = resolveStore(opts);

  const fresh = canonical(data);
  const stored = store.get(label);

  if (stored === undefined) {
    store.set(label, fresh);
    const result: MemoryResult = {
      changed: false,
      first: true,
      added: [],
      removed: [],
      modified: [],
      entries: [],
      summary: `✓ ${label} stored`,
    };
    if (opts.log !== false) {
      // eslint-disable-next-line no-console
      console.log(result.summary);
    }
    return result;
  }

  const entries = deepDiff(stored, fresh, opts.ignore ?? []);
  const grouped = (kind: ChangeEntry["kind"]) => entries.filter((e) => e.kind === kind);

  const result: MemoryResult = {
    changed: entries.length > 0,
    first: false,
    added: grouped("added"),
    removed: grouped("removed"),
    modified: grouped("modified"),
    entries,
    summary: "",
  };
  result.summary = formatSummary(label, result);

  // advance the stored state regardless of changes
  store.set(label, fresh);

  if (opts.log !== false && result.summary) {
    // eslint-disable-next-line no-console
    console.log(result.summary);
  }
  return result;
}

/** One-off deep diff without any storage. */
export function diff(a: unknown, b: unknown, ignore: string[] = []): ChangeEntry[] {
  return deepDiff(a, b, ignore);
}
