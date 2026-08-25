import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { coachCanEditProgram, getCoachScope } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);

    const admin = getSupabaseAdmin();
    const { data: program } = await admin
      .from("workout_programs")
      .select("plan_id, created_by")
      .eq("plan_id", decoded)
      .single();

    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    if (
      !coachCanEditProgram(scope, {
        created_by:
          (program as { created_by?: string | null }).created_by ?? null,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only reorder workouts in programs you created.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const workoutIds: unknown = body?.workout_ids;
    if (!Array.isArray(workoutIds) || workoutIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "workout_ids required" },
        { status: 400 },
      );
    }
    const ids = workoutIds.filter((v): v is string => typeof v === "string");

    // Verify all belong to this program (defense in depth)
    const { data: check } = await admin
      .from("workoutss")
      .select("id, plan_id")
      .in("id", ids);
    const belong = (check || []).every((w) => w.plan_id === decoded);
    if (!belong) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more workouts do not belong to this program.",
        },
        { status: 400 },
      );
    }

    // Two-phase to avoid unique-index collisions on (plan_id, order_index) if any
    for (let i = 0; i < ids.length; i++) {
      const { error } = await admin
        .from("workoutss")
        .update({ order_index: -(i + 1) - 1000000 })
        .eq("id", ids[i]);
      if (error) {
        return NextResponse.json(
          { success: false, error: `Phase 1: ${error.message}` },
          { status: 400 },
        );
      }
    }
    for (let i = 0; i < ids.length; i++) {
      const { error } = await admin
        .from("workoutss")
        .update({ order_index: i + 1 })
        .eq("id", ids[i]);
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
