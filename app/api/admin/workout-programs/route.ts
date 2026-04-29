import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const includeDeprecated =
      searchParams.get("include_deprecated") === "true";

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, gender, min_age, max_age, days_per_week, description, difficulty_level, is_deprecated, month_active, created_at",
      )
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    const { data, error } = await q;

    if (error) {
      console.error("[workout-programs GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, programs: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      plan_id,
      plan_name,
      gender = "All",
      min_age = 0,
      max_age = 120,
      days_per_week = 3,
      description = null,
      difficulty_level = null,
      equipment_required = [],
      base_plan_id = null,
      month_active = null,
    } = body;

    if (!plan_id || typeof plan_id !== "string" || !plan_id.trim()) {
      return NextResponse.json(
        { success: false, error: "plan_id is required (string)" },
        { status: 400 },
      );
    }
    if (!plan_name || typeof plan_name !== "string" || !plan_name.trim()) {
      return NextResponse.json(
        { success: false, error: "plan_name is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workout_programs")
      .insert({
        plan_id: plan_id.trim(),
        plan_name: plan_name.trim(),
        gender,
        min_age: Number(min_age),
        max_age: Number(max_age),
        days_per_week: Number(days_per_week),
        description,
        difficulty_level,
        equipment_required: Array.isArray(equipment_required)
          ? equipment_required
          : [],
        base_plan_id,
        month_active,
        is_deprecated: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[workout-programs POST]", error);
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
