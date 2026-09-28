import type { MemoryResult } from "./types";
import { render } from "./canonical";

/**
 * Human-friendly summary:
 *
 *   checkout changed
 *
 *   user.plan
 *     "free" → "pro"
 *
 *   + shipping.address: {...}
 *   coupon.code: removed
 */
export function formatSummary(label: string, result: MemoryResult): string {
  if (result.first) return `✓ ${label} stored`;
  if (!result.changed) return "";

  const lines: string[] = [`${label} changed`, ""];

  for (const m of result.modified) {
    lines.push(m.path);
    lines.push(`  ${render(m.from)} → ${render(m.to)}`);
    lines.push("");
  }
  for (const a of result.added) {
    lines.push(`+ ${a.path}: ${render(a.to)}`);
  }
  for (const r of result.removed) {
    lines.push(`${r.path} removed`);
  }

  return lines.join("\n").trimEnd();
}
