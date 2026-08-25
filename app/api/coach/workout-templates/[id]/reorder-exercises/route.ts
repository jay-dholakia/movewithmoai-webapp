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
          error: "You can only reorder exercises in workouts you created.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const rowIds: unknown = body?.row_ids;
    if (!Array.isArray(rowIds) || rowIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "row_ids required" },
        { status: 400 },
      );
    }
    const ids = rowIds.filter((v): v is string => typeof v === "string");

    // Defense in depth — every row must belong to this workout
    const { data: rows } = await admin
      .from("workout_exercises")
      .select("id, workout_template_id")
      .in("id", ids);
    const allBelong = (rows || []).every((r) => r.workout_template_id === id);
    if (!allBelong) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more rows do not belong to this workout.",
        },
        { status: 400 },
      );
    }

    // Phase 1: negative offsets to clear the unique constraint
    for (let i = 0; i < ids.length; i++) {
      const { error } = await admin
        .from("workout_exercises")
        .update({ order_index: -(i + 1) - 1000000 })
        .eq("id", ids[i])
        .eq("workout_template_id", id);
      if (error) {
        return NextResponse.json(
          { success: false, error: `Phase 1: ${error.message}` },
          { status: 400 },
        );
      }
    }
    // Phase 2: final positions (1-based)
    for (let i = 0; i < ids.length; i++) {
      const { error } = await admin
        .from("workout_exercises")
        .update({ order_index: i + 1 })
        .eq("id", ids[i])
        .eq("workout_template_id", id);
      if (error) {
        return NextResponse.json(
          { success: false, error: `Phase 2: ${error.message}` },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
