import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { isProgressiveOverloadEligible } from "@/lib/exercise-progressive-overload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Resolve the exercises in THIS workout, with the fields eligibility needs.
    const { data: rows, error: readErr } = await admin
      .from("workout_exercises")
      .select(
        "exercise_id, exercises ( id, name, equipment, exercise_type, log_type )",
      )
      .eq("workout_template_id", id);

    if (readErr) {
      return NextResponse.json(
        { success: false, error: readErr.message },
        { status: 500 },
      );
    }

    // When turning ON, only flip eligible exercises. When turning OFF, flip all
    // in the workout (so "off for this workout" reliably clears them).
    const targetIds = (rows ?? [])
      .map((r: any) => r.exercises)
      .filter(
        (ex: any) => ex && (!enabled || isProgressiveOverloadEligible(ex)),
      )
      .map((ex: any) => ex.id);

    const uniqueIds = [...new Set(targetIds)];
    if (uniqueIds.length === 0) {
      return NextResponse.json({ success: true, updated: 0, ids: [] });
    }

    const { error: updErr } = await admin
      .from("exercises")
      .update({ progressive_overload: enabled })
      .in("id", uniqueIds);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: updErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      updated: uniqueIds.length,
      ids: uniqueIds,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
