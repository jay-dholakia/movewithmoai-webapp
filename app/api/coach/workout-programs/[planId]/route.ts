// app/api/coach/workout-programs/[planId]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import {
  coachCanEditProgram,
  coachCanSeeProgram,
  getCoachScope,
} from "@/lib/server/coach-scope";
import { applyProgramAssignment } from "@/lib/services/program-assignment";

type Ctx = { params: Promise<{ planId: string }> };

async function loadProgramOr404(planId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("workout_programs")
    .select("*")
    .eq("plan_id", planId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const program = await loadProgramOr404(decoded);
    if (!program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const p = program as {
      created_by: string | null;
      assigned_focus_moai_id: string | null;
      assigned_user_id: string | null;
    };
    if (!coachCanSeeProgram(scope, p)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      program,
      can_edit: coachCanEditProgram(scope, p),
      is_mine: p.created_by === scope.userId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);

    const before = await loadProgramOr404(decoded);
    if (!before) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    if (
      !coachCanEditProgram(scope, {
        created_by:
          (before as { created_by?: string | null }).created_by ?? null,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only edit programs you created. Duplicate first.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // ── Handle assignment (assign_type + assign_to_id) ──
    const { assign_type, assign_to_id } = body as {
      assign_type?: string;
      assign_to_id?: string;
    };
    let assignmentPatch: Record<string, unknown> = {};
    if (assign_type && assign_to_id) {
      if (assign_type === "user") {
        assignmentPatch = {
          assigned_user_id: assign_to_id,
          assigned_focus_moai_id: null,
          is_paid: true,
        };
      } else if (assign_type === "focus_moai") {
        assignmentPatch = {
          assigned_focus_moai_id: assign_to_id,
          assigned_user_id: null,
          is_paid: true,
        };
      }
    }

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
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }
    // Never allow ownership fields via generic PATCH keys
    delete patch.created_by;

    // Merge assignment fields (these bypass the allowed list on purpose)
    Object.assign(patch, assignmentPatch);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    if ("status" in patch) {
      const s = patch.status;
      if (s !== "draft" && s !== "published") {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 },
        );
      }
    }

    patch.updated_at = new Date().toISOString();

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

    const wasPublished = before.status === "published";
    const isNowPublished = data.status === "published";

    // Apply assignment on publish OR when assignment was just set
    if ((isNowPublished && !wasPublished) || (assign_type && assign_to_id)) {
      await applyProgramAssignment(admin, {
        id: data.id,
        assigned_focus_moai_id: data.assigned_focus_moai_id,
        assigned_user_id: data.assigned_user_id,
      });
    }

    return NextResponse.json({
      success: true,
      program: data,
      can_edit: coachCanEditProgram(scope, {
        created_by: data.created_by ?? null,
      }),
      is_mine: data.created_by === scope.userId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const program = await loadProgramOr404(decoded);
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
          error: "You can only delete programs you created.",
        },
        { status: 403 },
      );
    }

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
