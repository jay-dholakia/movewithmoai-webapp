import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { CoachScope } from "@/lib/server/coach-scope";
import { loadVisibleWorkout } from "@/lib/server/coach-workout-access";

/**
 * Coaches can read the warmup of any workout they can see, but only edit the
 * warmup of workouts they created (same rule as the workout itself).
 */
export async function checkCoachWarmupAccess(
  workoutId: string,
  scope: CoachScope,
  mode: "read" | "write",
): Promise<NextResponse | null> {
  if (mode === "read") {
    const { workout, allowed } = await loadVisibleWorkout(workoutId, scope);
    if (!workout) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    return null;
  }

  const { data: workout } = await getSupabaseAdmin()
    .from("workoutss")
    .select("id, created_by")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) {
    return NextResponse.json(
      { success: false, error: "Workout not found" },
      { status: 404 },
    );
  }
  if ((workout as { created_by?: string | null }).created_by !== scope.userId) {
    return NextResponse.json(
      {
        success: false,
        error: "You can only edit workouts you created. Duplicate first.",
      },
      { status: 403 },
    );
  }
  return null;
}
