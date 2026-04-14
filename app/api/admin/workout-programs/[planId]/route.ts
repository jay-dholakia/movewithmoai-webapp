import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workout_programs")
      .select("*")
      .eq("plan_id", decoded)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, program: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const body = await request.json();

    const allowed = [
      "plan_name",
      "gender",
      "min_age",
      "max_age",
      "days_per_week",
      "description",
      "difficulty_level",
      "equipment_required",
      "base_plan_id",
      "is_deprecated",
      "month_active",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workout_programs")
      .update(patch)
      .eq("plan_id", decoded)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, program: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("workout_programs")
      .delete()
      .eq("plan_id", decoded);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
