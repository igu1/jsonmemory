import { canonical } from "./canonical";
import type { ChangeEntry, MemoryResult } from "./types";

/** Is this dotted-path matched by an ignore entry? */
export function isIgnored(path: string, ignore: string[]): boolean {
  if (ignore.length === 0) return false;
  if (ignore.includes(path)) return true;
  const leaf = path.split(".").pop() as string;
  return ignore.includes(leaf);
}

type Node = { added: ChangeEntry[]; removed: ChangeEntry[]; modified: ChangeEntry[] };

function push(node: Node, e: ChangeEntry) {
  if (e.kind === "added") node.added.push(e);
  else if (e.kind === "removed") node.removed.push(e);
  else node.modified.push(e);
}

const KNOWN_MARKERS = new Set([
  "__date", "__bigint", "__nan", "__inf", "__fn",
  "__undefined", "__map", "__set", "__regexp", "__unknown",
]);

/** Detect canonical marker objects ({__date: ...} etc.) so they compare as leaves. */
function isMarkerLeaf(x: unknown): boolean {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const keys = Object.keys(x as Record<string, unknown>);
  return keys.length > 0 && keys.every((k) => KNOWN_MARKERS.has(k));
}

const bothObjects = (a: unknown, b: unknown): boolean =>
  a !== null && b !== null &&
  typeof a === "object" && typeof b === "object" &&
  !Array.isArray(a) && !Array.isArray(b);

const bothArrays = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b);

/**
 * Deep-compare two canonical values and produce human-friendly entries:
 *
 *   user.plan          modified:  "free" → "pro"
 *   cart.items         modified:  3 → 4        (array length change)
 *   cart.items[2].name modified:  "Old" → "New"
 *   + shipping.address            added
 *   coupon.code        removed
 */
export function diffCanonical(
  a: unknown,
  b: unknown,
  opts: { prefix?: string; ignore?: string[]; out?: Node } = {},
): Node {
  const ignore = opts.ignore ?? [];
  const pathOf = (key: string) => (opts.prefix ? `${opts.prefix}.${key}` : key);
  const out: Node = opts.out ?? { added: [], removed: [], modified: [] };

  if (
    bothObjects(a, b) &&
    !isMarkerLeaf(a) && !isMarkerLeaf(b)
  ) {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const key of keys) {
      const path = pathOf(key);
      if (isIgnored(path, ignore)) continue;
      const inA = key in ao;
      const inB = key in bo;
      if (inA && !inB) push(out, { kind: "removed", path, from: ao[key] });
      else if (!inA && inB) push(out, { kind: "added", path, to: bo[key] });
      else diffCanonical(ao[key], bo[key], { prefix: path, ignore, out });
    }
    return out;
  }

  if (bothArrays(a, b)) {
    const aa = a as unknown[];
    const bb = b as unknown[];
    if (aa.length !== bb.length) {
      const p = opts.prefix ?? "(array)";
      if (!isIgnored(p, ignore)) {
        push(out, { kind: "modified", path: p, from: aa.length, to: bb.length });
      }
    }
    const n = Math.min(aa.length, bb.length);
    for (let i = 0; i < n; i++) {
      const p = opts.prefix ? `${opts.prefix}[${i}]` : `[${i}]`;
      if (isIgnored(p, ignore)) continue;
      diffCanonical(aa[i], bb[i], { prefix: p, ignore, out });
    }
    return out;
  }

  // leaf comparison
  if (opts.prefix && !isIgnored(opts.prefix, ignore)) {
    const equal = JSON.stringify(a) === JSON.stringify(b);
    if (!equal) push(out, { kind: "modified", path: opts.prefix, from: a, to: b });
  }
  return out;
}

/** Public deep diff (canonicalizes both sides first). Changed first, then added, then removed. */
export function deepDiff(
  a: unknown,
  b: unknown,
  ignore: string[] = [],
): MemoryResult["entries"] {
  const ca = canonical(a);
  const cb = canonical(b);
  const out = diffCanonical(ca, cb, { ignore });
  return [...out.modified, ...out.added, ...out.removed];
}
