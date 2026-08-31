import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { applyProgramAssignment } from "@/lib/services/program-assignment";

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
      "status",
      "is_paid",
      "assigned_focus_moai_id",
      "assigned_user_id",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    delete (patch as Record<string, unknown>).created_by;

    if ("status" in patch) {
      const s = patch.status;
      if (s !== "draft" && s !== "published") {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Snapshot the pre-patch row so we know whether this PATCH is crossing
    // draft → published, or changing the assignment target while already
    // published. Assignment side effects (linking workout_focus, setting
    // users.current_plan) run ONLY in those two cases — never on plain
    // metadata edits, and never on creation.
    const { data: before } = await admin
      .from("workout_programs")
      .select("status, assigned_focus_moai_id, assigned_user_id")
      .eq("plan_id", decoded)
      .single();

    patch.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("workout_programs")
      .update(patch)
      .eq("plan_id", decoded)
      .select()
      .single();

    if (error) {
      console.error("[workout-programs PATCH]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    const wasPublished = before?.status === "published";
    const isNowPublished = data.status === "published";
    const assignmentTargetChanged =
      "assigned_focus_moai_id" in patch || "assigned_user_id" in patch;

    if (isNowPublished && (!wasPublished || assignmentTargetChanged)) {
      await applyProgramAssignment(admin, {
        id: data.id,
        assigned_focus_moai_id: data.assigned_focus_moai_id,
        assigned_user_id: data.assigned_user_id,
      });
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
