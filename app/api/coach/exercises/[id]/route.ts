import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwnedExercise(exerciseId: string, userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("exercises")
    .select("id, created_by")
    .eq("id", exerciseId)
    .single();
  if (error || !data)
    return { ok: false as const, status: 404, error: "Exercise not found" };
  if ((data as { created_by?: string | null }).created_by !== userId) {
    return {
      ok: false as const,
      status: 403,
      error: "You can only edit exercises you created.",
    };
  }
  return { ok: true as const };
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const decoded = decodeURIComponent(id);
    const guard = await loadOwnedExercise(decoded, auth.userId);
    if (!guard.ok) {
      return NextResponse.json(
        { success: false, error: guard.error },
        { status: guard.status },
      );
    }

    const body = await request.json();
    const allowed = [
      "name",
      "category",
      "muscle_group",
      "log_type",
      "instructions",
      "equipment",
      "form_video_url",
      "progressive_overload",
      "exercise_level",
      "is_unilateral",
      "rep_duration",
      "alternative_exercise_ids",
      "contraindication",
      "caution",
      "recommend",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }
    delete (patch as Record<string, unknown>).created_by;

    if (
      "log_type" in patch &&
      patch.log_type !== null &&
      !["weight_reps", "reps", "duration", "distance"].includes(
        patch.log_type as string,
      )
    ) {
      return NextResponse.json(
        { success: false, error: "invalid log_type" },
        { status: 400 },
      );
    }
    if (
      "equipment" in patch &&
      patch.equipment !== null &&
      !Array.isArray(patch.equipment)
    ) {
      return NextResponse.json(
        { success: false, error: "equipment must be an array of strings" },
        { status: 400 },
      );
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("exercises")
      .update(patch)
      .eq("id", decoded)
      .select()
      .single();

    if (error) {
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

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const decoded = decodeURIComponent(id);
    const guard = await loadOwnedExercise(decoded, auth.userId);
    if (!guard.ok) {
      return NextResponse.json(
        { success: false, error: guard.error },
        { status: guard.status },
      );
    }

    const admin = getSupabaseAdmin();

    // Check whether the exercise is currently referenced by any workout_exercises row.
    // If it is, deleting it would break those workouts (potentially owned by others).
    // Block with a clear message; the coach can duplicate the exercise instead.
    const { count } = await admin
      .from("workout_exercises")
      .select("id", { count: "exact", head: true })
      .eq("exercise_id", decoded);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `This exercise is used in ${count} workout row${count === 1 ? "" : "s"} and can't be deleted. Remove it from those workouts first.`,
        },
        { status: 409 },
      );
    }

    const { error } = await admin.from("exercises").delete().eq("id", decoded);
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
