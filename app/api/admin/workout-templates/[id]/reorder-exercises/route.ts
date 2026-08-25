import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await verifyAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { id: workoutId } = await context.params;
  const { row_ids } = await request.json();

  if (!Array.isArray(row_ids) || row_ids.length === 0) {
    return NextResponse.json(
      { success: false, error: "row_ids required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  for (let i = 0; i < row_ids.length; i++) {
    const { error } = await admin
      .from("workout_exercises")
      .update({ order_index: -(i + 1) - 1000000 })
      .eq("id", row_ids[i])
      .eq("workout_template_id", workoutId);
    if (error) {
      return NextResponse.json(
        { success: false, error: `Phase 1 failed: ${error.message}` },
        { status: 400 },
      );
    }
  }

  for (let i = 0; i < row_ids.length; i++) {
    const { error } = await admin
      .from("workout_exercises")
      .update({ order_index: i + 1 })
      .eq("id", row_ids[i])
      .eq("workout_template_id", workoutId);
    if (error) {
      return NextResponse.json(
        { success: false, error: `Phase 2 failed: ${error.message}` },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
