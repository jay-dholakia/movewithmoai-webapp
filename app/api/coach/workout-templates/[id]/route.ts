import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";
import { loadVisibleWorkout } from "@/lib/server/coach-workout-access";
import { clearWarmupOverridesOnFocusChange } from "@/lib/server/workout-warmup";
import { INVALID_FOCUS_ERROR, isWorkoutFocus } from "@/lib/workout-focus";

type Ctx = { params: Promise<{ id: string }> };

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
      .select("id, created_by, plan_id, type")
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
      "is_bodyweight",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    delete (patch as Record<string, unknown>).created_by;

    if ("type" in patch && !isWorkoutFocus(patch.type)) {
      return NextResponse.json(
        { success: false, error: INVALID_FOCUS_ERROR },
        { status: 400 },
      );
    }
    if ("is_bodyweight" in patch) patch.is_bodyweight = Boolean(patch.is_bodyweight);

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
    const warmup_overrides_cleared = await clearWarmupOverridesOnFocusChange(
      admin,
      id,
      (workout as { type?: string | null }).type,
      patch.type as string | undefined,
    );
    return NextResponse.json({ success: true, workout: data, warmup_overrides_cleared });
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
