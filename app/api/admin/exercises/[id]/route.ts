import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { isProgressiveOverloadEligible } from "@/lib/exercise-progressive-overload";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // drop Promise/await on Next 14
) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { progressive_overload } = body;

    if (typeof progressive_overload !== "boolean") {
      return NextResponse.json(
        { success: false, error: "progressive_overload must be a boolean" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Re-check eligibility server-side; the client gate is a convenience only.
    if (progressive_overload) {
      const { data: existing, error: readErr } = await admin
        .from("exercises")
        .select("name, equipment, exercise_type, log_type")
        .eq("id", id)
        .maybeSingle();

      if (readErr) {
        console.error("[exercises PATCH read]", readErr);
        return NextResponse.json(
          { success: false, error: readErr.message },
          { status: 500 },
        );
      }
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Exercise not found" },
          { status: 404 },
        );
      }
      if (!isProgressiveOverloadEligible(existing)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Progressive overload only applies to machine, barbell, or dumbbell exercises logged by weight.",
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await admin
      .from("exercises")
      .update({ progressive_overload })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[exercises PATCH]", error);
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
