import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope, coachCanSeeProgram } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Returns the workout if it exists AND the coach may see it.
 * Visibility: coach owns it, OR it's in a program the coach can see, OR it's unassigned.
 */
async function loadVisibleWorkout(
  workoutId: string,
  scope: Awaited<ReturnType<typeof getCoachScope>>,
) {
  const admin = getSupabaseAdmin();
  const { data: workout } = await admin
    .from("workoutss")
    .select("*")
    .eq("id", workoutId)
    .single();
  if (!workout) return { workout: null as null, allowed: false };

  const cb = (workout as { created_by?: string | null }).created_by ?? null;
  if (cb === scope.userId) return { workout, allowed: true };

  const planId = (workout as { plan_id?: string | null }).plan_id ?? null;
  if (!planId) {
    // Unassigned library workout — coach can see and duplicate but not edit
    return { workout, allowed: true };
  }

  const { data: program } = await admin
    .from("workout_programs")
    .select("created_by, assigned_focus_moai_id, assigned_user_id")
    .eq("plan_id", planId)
    .single();
  if (!program) return { workout, allowed: true }; // orphaned workout — visible

  const canSee = coachCanSeeProgram(scope, {
    created_by: (program as { created_by?: string | null }).created_by ?? null,
    assigned_focus_moai_id:
      (program as { assigned_focus_moai_id?: string | null })
        .assigned_focus_moai_id ?? null,
    assigned_user_id:
      (program as { assigned_user_id?: string | null }).assigned_user_id ??
      null,
  });
  return { workout, allowed: canSee };
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { id } = await context.params;
    const { workout, allowed } = await loadVisibleWorkout(id, scope);
    if (!workout) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const cb = (workout as { created_by?: string | null }).created_by ?? null;
    return NextResponse.json({
      success: true,
      workout,
      can_edit: cb === scope.userId,
      is_mine: cb === scope.userId,
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

    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: workout } = await admin
      .from("workoutss")
      .select("id, created_by, plan_id")
      .eq("id", id)
      .single();
    if (!workout) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }
    if (
      (workout as { created_by?: string | null }).created_by !== scope.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only edit workouts you created. Duplicate first.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const allowed = [
      "title",
      "type",
      "plan_id",
      "description",
      "order_index",
      "is_circuit",
      "difficulty_level",
      "estimated_duration_minutes",
      "duration_minutes",
      "tags",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    delete (patch as Record<string, unknown>).created_by;

    // If reassigning to a different program, must own that program too
    if ("plan_id" in patch && patch.plan_id) {
      const { data: program } = await admin
        .from("workout_programs")
        .select("plan_id, created_by")
        .eq("plan_id", patch.plan_id as string)
        .single();
      if (
        !program ||
        (program as { created_by?: string | null }).created_by !== scope.userId
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "You can only assign workouts to programs you created.",
          },
          { status: 403 },
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("workoutss")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, workout: data });
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

    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: workout } = await admin
      .from("workoutss")
      .select("id, created_by")
      .eq("id", id)
      .single();
    if (!workout) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }
    if (
      (workout as { created_by?: string | null }).created_by !== scope.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only delete workouts you created.",
        },
        { status: 403 },
      );
    }

    const { error } = await admin.from("workoutss").delete().eq("id", id);
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
