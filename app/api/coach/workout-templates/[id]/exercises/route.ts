import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope, coachCanSeeProgram } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ id: string }> };

// Fields projected from the joined `exercises` table. `log_type` and
// `is_unilateral` are what the workout builder UI needs to correctly label
// the primary metric (Reps vs Time) and show the L/R chip. The rest are
// small cheap extras that unlock future UI (equipment badges, etc.) without
// another round-trip.
const EXERCISE_JOIN_FIELDS =
  "id, name, log_type, is_unilateral, exercise_type, category, muscle_group, equipment, form_video_url";

async function coachCanSeeWorkout(
  workoutId: string,
  scope: Awaited<ReturnType<typeof getCoachScope>>,
): Promise<{
  workout: {
    id: string;
    created_by: string | null;
    plan_id: string | null;
  } | null;
  allowed: boolean;
}> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("workoutss")
    .select("id, created_by, plan_id")
    .eq("id", workoutId)
    .single();
  if (!data) return { workout: null, allowed: false };

  const w = data as {
    id: string;
    created_by: string | null;
    plan_id: string | null;
  };
  if (w.created_by === scope.userId) return { workout: w, allowed: true };
  if (!w.plan_id) return { workout: w, allowed: true };

  const { data: program } = await admin
    .from("workout_programs")
    .select("created_by, assigned_focus_moai_id, assigned_user_id")
    .eq("plan_id", w.plan_id)
    .single();
  if (!program) return { workout: w, allowed: true };

  return {
    workout: w,
    allowed: coachCanSeeProgram(scope, {
      created_by:
        (program as { created_by?: string | null }).created_by ?? null,
      assigned_focus_moai_id:
        (program as { assigned_focus_moai_id?: string | null })
          .assigned_focus_moai_id ?? null,
      assigned_user_id:
        (program as { assigned_user_id?: string | null }).assigned_user_id ??
        null,
    }),
  };
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { id } = await context.params;
    const { workout, allowed } = await coachCanSeeWorkout(id, scope);
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

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workout_exercises")
      .select(`*, exercises(${EXERCISE_JOIN_FIELDS})`)
      .eq("workout_template_id", id)
      .order("order_index", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, exercises: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: workout } = await admin
      .from("workoutss")
      .select("id, created_by")
      .eq("id", id)
      .single();
    if (!workout) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }
    if (
      (workout as { created_by?: string | null }).created_by !== scope.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only add exercises to workouts you created.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      exercise_id,
      order_index,
      sets,
      reps = null,
      reps_display = null,
      rest_seconds = null,
      rest_display = null,
      notes = null,
      group_id = null,
      group_type = null,
    } = body as {
      exercise_id?: string;
      order_index?: number;
      sets?: number;
      reps?: number | null;
      reps_display?: string | null;
      rest_seconds?: number | null;
      rest_display?: string | null;
      notes?: string | null;
      group_id?: number | null;
      group_type?: "circuit" | "superset" | null;
    };

    if (!exercise_id) {
      return NextResponse.json(
        { success: false, error: "exercise_id required" },
        { status: 400 },
      );
    }
    if (typeof order_index !== "number" || typeof sets !== "number") {
      return NextResponse.json(
        { success: false, error: "order_index and sets must be numbers" },
        { status: 400 },
      );
    }
    if (group_type !== null && !["circuit", "superset"].includes(group_type)) {
      return NextResponse.json(
        { success: false, error: "invalid group_type" },
        { status: 400 },
      );
    }

    const { data: ex } = await admin
      .from("exercises")
      .select("id")
      .eq("id", exercise_id)
      .single();
    if (!ex) {
      return NextResponse.json(
        { success: false, error: "Exercise not found" },
        { status: 404 },
      );
    }

    const { data, error } = await admin
      .from("workout_exercises")
      .insert({
        workout_template_id: id,
        exercise_id,
        order_index,
        sets,
        reps,
        reps_display,
        rest_seconds,
        rest_display,
        notes,
        group_id,
        group_type,
      })
      .select(`*, exercises(${EXERCISE_JOIN_FIELDS})`)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, exercise: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
