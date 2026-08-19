import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ planId: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const body = await request.json();
    const { is_free_library } = body;

    if (typeof is_free_library !== "boolean") {
      return NextResponse.json(
        { success: false, error: "is_free_library must be a boolean" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Guard: only free (non-paid) programs can be added to the free library
    if (is_free_library) {
      const { data: program } = await admin
        .from("workout_programs")
        .select("is_paid")
        .eq("plan_id", decoded)
        .single();

      if (program?.is_paid) {
        return NextResponse.json(
          {
            success: false,
            error: "Only free programs can be added to the free library",
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await admin
      .from("workout_programs")
      .update({ is_free_library, updated_at: new Date().toISOString() })
      .eq("plan_id", decoded)
      .select()
      .single();

    if (error) {
      console.error("[free-library PATCH]", error);
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
