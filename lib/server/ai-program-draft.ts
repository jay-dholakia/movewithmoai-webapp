import type { SupabaseClient } from "@supabase/supabase-js";

export * from "@/lib/ai-program-draft-zod";

export async function assertExerciseIdsExist(
  admin: SupabaseClient,
  ids: string[],
): Promise<{ missing: string[] }> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { missing: [] };
  const { data, error } = await admin
    .from("exercises")
    .select("id")
    .in("id", unique);
  if (error) {
    throw new Error(error.message);
  }
  const found = new Set((data ?? []).map((r) => r.id as string));
  const missing = unique.filter((id) => !found.has(id));
  return { missing };
}
