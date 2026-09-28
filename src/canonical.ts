/**
 * Canonicalization: turn any value into a JSON-safe deep copy so that
 * comparisons are stable and snapshots can be persisted as plain JSON.
 *
 * - Date  -> { __date: "ISO" }
 * - Map   -> plain object
 * - Set   -> array
 * - BigInt-> { __bigint: "n" }
 * - NaN -> { __nan: true }, Infinity -> { __inf: ±1 }
 * - functions -> { __fn: name }
 */
export function canonical(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return { __undefined: true };

  switch (typeof value) {
    case "number":
      if (Number.isNaN(value)) return { __nan: true };
      if (value === Infinity) return { __inf: 1 };
      if (value === -Infinity) return { __inf: -1 };
      return value;
    case "bigint":
      return { __bigint: String(value) };
    case "string":
    case "boolean":
      return value;
    case "function":
      return { __fn: value.name || "anonymous" };
    case "object":
      break;
    default:
      return { __unknown: String(value) };
  }

  if (value instanceof Date) {
    return { __date: value.toISOString() };
  }
  if (value instanceof Map) {
    const inner: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) inner[String(k)] = canonical(v);
    return { __map: inner };
  }
  if (value instanceof Set) {
    return { __set: [...value.values()].map(canonical) };
  }
  if (value instanceof RegExp) {
    return { __regexp: value.toString() };
  }

  if (Array.isArray(value)) return value.map(canonical);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "undefined") out[k] = canonical(v);
    else out[k] = { __undefined: true };
  }
  return out;
}

/** Compact rendering used in diff summaries: strings quoted, objects JSON. */
export function render(value: unknown): string {
  const c = canonical(value);
  if (typeof c === "string") return JSON.stringify(c);
  if (typeof c === "number" || typeof c === "boolean") return String(c);
  if (c === null) return "null";
  if (Array.isArray(c)) {
    if (c.length === 0) return "[]";
    if (c.length <= 5) return `[${c.map(render).join(", ")}]`;
    return `[...${c.length} items]`;
  }
  const keys = Object.keys(c as object);
  if (keys.length === 1 && keys[0] === "__date") return `Date(${(c as any).__date})`;
  if (keys.length === 1 && keys[0] === "__undefined") return "undefined";
  return JSON.stringify(c);
}
