// app/api/coach/workout-programs/[planId]/variants/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await params;
    const admin = getSupabaseAdmin();

    // Get parent program first
    const { data: parent } = await admin
      .from("workout_programs")
      .select("id")
      .eq("plan_id", planId)
      .single();

    if (!parent) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const { data: variants, error } = await admin
      .from("workout_programs")
      .select("*")
      .eq("parent_program_id", parent.id)
      .order("variant_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, variants: variants ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await params;
    const admin = getSupabaseAdmin();

    // Look up parent by plan_id slug
    const { data: parent } = await admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, difficulty_level, description, created_by",
      )
      .eq("plan_id", planId)
      .single();

    if (!parent || parent.created_by !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Program not found or not yours" },
        { status: 403 },
      );
    }

    // Check no existing variants
    const { data: existing } = await admin
      .from("workout_programs")
      .select("id")
      .eq("parent_program_id", parent.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Variants already exist for this program" },
        { status: 409 },
      );
    }

    // Create 5 variants (1-day through 5-day)
    const inserts = Array.from({ length: 5 }, (_, i) => ({
      plan_id: `${parent.plan_id}_v${i + 1}`,
      plan_name: `${parent.plan_name} (${i + 1}-Day)`,
      difficulty_level: parent.difficulty_level,
      description: parent.description,
      parent_program_id: parent.id,
      variant_number: i + 1,
      days_per_week: i + 1,
      gender: "All",
      min_age: 0,
      max_age: 120,
      equipment_required: [],
      is_paid: false,
      is_deprecated: false,
      status: "draft",
      created_by: auth.userId,
    }));

    const { data: variants, error } = await admin
      .from("workout_programs")
      .insert(inserts)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, variants });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
