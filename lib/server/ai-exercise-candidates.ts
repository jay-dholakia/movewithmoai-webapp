import type { SupabaseClient } from "@supabase/supabase-js";

export type ExerciseCandidate = {
  id: string;
  name: string;
  category: string | null;
};

/**
 * Build a bounded list of exercises for the model: keyword hits from the prompt
 * plus alphabetical fill so common moves are still available.
 */
export async function loadExerciseCandidatesForPrompt(
  admin: SupabaseClient,
  prompt: string,
  maxTotal = 280,
): Promise<ExerciseCandidate[]> {
  const tokens = [
    ...new Set(
      prompt
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((t) => t.length >= 3),
    ),
  ].slice(0, 14);

  const byId = new Map<string, ExerciseCandidate>();

  for (const token of tokens) {
    const { data } = await admin
      .from("exercises")
      .select("id, name, category")
      .ilike("name", `%${token}%`)
      .limit(70);
    for (const row of data ?? []) {
      byId.set(row.id, {
        id: row.id,
        name: row.name as string,
        category: (row.category as string | null) ?? null,
      });
    }
    if (byId.size >= maxTotal) break;
  }

  if (byId.size < maxTotal) {
    const { data: more } = await admin
      .from("exercises")
      .select("id, name, category")
      .order("name", { ascending: true })
      .limit(600);
    for (const row of more ?? []) {
      if (byId.size >= maxTotal) break;
      if (byId.has(row.id)) continue;
      byId.set(row.id, {
        id: row.id,
        name: row.name as string,
        category: (row.category as string | null) ?? null,
      });
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
