import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ id: string }> };

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
          error: "You can only run bulk operations on workouts you created.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const enabled = Boolean(body?.enabled);

    // Get all exercise ids referenced by this workout
    const { data: rows } = await admin
      .from("workout_exercises")
      .select("exercise_id")
      .eq("workout_template_id", id);
    const exerciseIds = Array.from(
      new Set(
        (rows || [])
          .map((r) => (r as { exercise_id?: string | null }).exercise_id)
          .filter((v): v is string => !!v),
      ),
    );

    if (exerciseIds.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        skipped: 0,
      });
    }

    // Load them so we can check log_type eligibility + ownership
    const { data: exercises } = await admin
      .from("exercises")
      .select("id, log_type, created_by")
      .in("id", exerciseIds);

    const eligible = (exercises || []).filter((ex) => {
      // Progressive overload applies to weight_reps exercises
      return (ex as { log_type?: string | null }).log_type === "weight_reps";
    });

    const ownedIds = eligible
      .filter(
        (ex) =>
          (ex as { created_by?: string | null }).created_by === scope.userId,
      )
      .map((ex) => ex.id as string);
    const skippedNotOwned = eligible.length - ownedIds.length;

    if (ownedIds.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        skipped: skippedNotOwned,
        note:
          skippedNotOwned > 0
            ? "None of the eligible exercises in this workout were created by you."
            : undefined,
      });
    }

    const { error } = await admin
      .from("exercises")
      .update({ progressive_overload: enabled })
      .in("id", ownedIds);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      updated: ownedIds.length,
      skipped: skippedNotOwned,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
