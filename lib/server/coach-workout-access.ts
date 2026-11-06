import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { coachCanSeeProgram, type CoachScope } from "@/lib/server/coach-scope";

/**
 * Returns the workout if it exists AND the coach may see it.
 * Visibility: coach owns it, OR it's in a program the coach can see, OR it's unassigned.
 */
export async function loadVisibleWorkout(
  workoutId: string,
  scope: CoachScope,
) {
  const admin = getSupabaseAdmin();
  const { data: workout } = await admin
    .from("workoutss")
    .select("*")
    .eq("id", workoutId)
    .single();
  if (!workout) return { workout: null as null, allowed: false };

  const cb = (workout as { created_by?: string | null }).created_by ?? null;
  if (cb === scope.userId) return { workout, allowed: true };

  const planId = (workout as { plan_id?: string | null }).plan_id ?? null;
  if (!planId) {
    // Unassigned library workout — coach can see and duplicate but not edit
    return { workout, allowed: true };
  }

  const { data: program } = await admin
    .from("workout_programs")
    .select("created_by, assigned_focus_moai_id, assigned_user_id")
    .eq("plan_id", planId)
    .single();
  if (!program) return { workout, allowed: true }; // orphaned workout — visible

  const canSee = coachCanSeeProgram(scope, {
    created_by: (program as { created_by?: string | null }).created_by ?? null,
    assigned_focus_moai_id:
      (program as { assigned_focus_moai_id?: string | null })
        .assigned_focus_moai_id ?? null,
    assigned_user_id:
      (program as { assigned_user_id?: string | null }).assigned_user_id ??
      null,
  });
  return { workout, allowed: canSee };
}
