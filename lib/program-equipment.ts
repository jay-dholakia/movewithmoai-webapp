/**
 * Derive display equipment tags from a row in `exercises`.
 * Uses `equipment` when present (array, or comma/semicolon-separated string).
 * Falls back to `category` when nothing else is set.
 */
export function equipmentStringsFromExerciseRow(row: {
  equipment?: unknown;
  category?: string | null;
}): string[] {
  const out: string[] = [];
  const eq = row.equipment;
  if (Array.isArray(eq)) {
    for (const x of eq) {
      if (typeof x === "string" && x.trim()) out.push(x.trim());
    }
  } else if (typeof eq === "string" && eq.trim()) {
    out.push(
      ...eq
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  if (
    out.length === 0 &&
    typeof row.category === "string" &&
    row.category.trim()
  ) {
    out.push(row.category.trim());
  }
  return out;
}

/** Case-insensitive unique, stable sort for storage / UI */
export function mergeEquipmentList(strings: string[]): string[] {
  const seen = new Map<string, string>();
  for (const s of strings) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, t);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
