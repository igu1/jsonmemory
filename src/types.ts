export type DiffKind = "added" | "removed" | "modified";

export interface ChangeEntry {
  kind: DiffKind;
  /** dotted path, arrays indexed like `cart.items[2].name` */
  path: string;
  /** previous value (missing for "added") */
  from?: unknown;
  /** new value (missing for "removed") */
  to?: unknown;
}

export interface MemoryResult {
  /** `true` when the stored snapshot exists and differs */
  changed: boolean;
  /** `true` when this call created the snapshot (nothing to compare yet) */
  first: boolean;
  added: ChangeEntry[];
  removed: ChangeEntry[];
  modified: ChangeEntry[];
  /** all changes as one flat list */
  entries: ChangeEntry[];
  /** human-readable multi-line summary ("" when unchanged) */
  summary: string;
}

export interface MemoryOptions {
  /**
   * Ignore fields by leaf key name or dotted path. Keys named here are
   * skipped wherever they appear unless a full dotted path is given.
   */
  ignore?: string[];
  /** "memory" (default) or a directory path like ".jsonmemory" */
  storage?: "memory" | string;
  /** print the summary via console.log (default: true) */
  log?: boolean;
}

export interface MemoryAdapter {
  get(label: string): unknown | undefined;
  set(label: string, value: unknown): void;
  delete(label: string): void;
  /** optional: clear all entries (used by reset() for file/redis stores) */
  clearAll?: () => void;
}

export interface JsonMemoryConfig {
  /** applied whenever an option is omitted */
  defaults?: MemoryOptions;
  /** custom key/value adapter — all three methods required */
  adapter?: MemoryAdapter;
}
