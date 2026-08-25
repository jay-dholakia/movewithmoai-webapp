import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ rowId: string }> };

async function loadRowAndVerifyOwner(
  rowId: string,
  scope: Awaited<ReturnType<typeof getCoachScope>>,
): Promise<
  | { ok: true; row: { id: string; workout_template_id: string } }
  | { ok: false; status: number; error: string }
> {
  const admin = getSupabaseAdmin();

  const { data: row } = await admin
    .from("workout_exercises")
    .select("id, workout_template_id")
    .eq("id", rowId)
    .single();
  if (!row) return { ok: false, status: 404, error: "Exercise row not found" };

  const workoutId = (row as { workout_template_id?: string | null })
    .workout_template_id;
  if (!workoutId) {
    return {
      ok: false,
      status: 400,
      error: "Row is not attached to any workout",
    };
  }

  const { data: workout } = await admin
    .from("workoutss")
    .select("created_by")
    .eq("id", workoutId)
    .single();
  if (!workout) {
    return { ok: false, status: 404, error: "Parent workout not found" };
  }
  if ((workout as { created_by?: string | null }).created_by !== scope.userId) {
    return {
      ok: false,
      status: 403,
      error: "You can only edit exercises inside workouts you created.",
    };
  }

  return {
    ok: true,
    row: { id: row.id as string, workout_template_id: workoutId },
  };
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { rowId } = await context.params;
    const guard = await loadRowAndVerifyOwner(rowId, scope);
    if (!guard.ok) {
      return NextResponse.json(
        { success: false, error: guard.error },
        { status: guard.status },
      );
    }

    const body = await request.json();
    const allowed = [
      "order_index",
      "sets",
      "reps",
      "reps_display",
      "rest_seconds",
      "rest_display",
      "notes",
      "group_id",
      "group_type",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    if (
      "group_type" in patch &&
      patch.group_type !== null &&
      !["circuit", "superset"].includes(patch.group_type as string)
    ) {
      return NextResponse.json(
        { success: false, error: "invalid group_type" },
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
      .from("workout_exercises")
      .update(patch)
      .eq("id", rowId)
      .select("*, exercises(id, name)")
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
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { rowId } = await context.params;
    const guard = await loadRowAndVerifyOwner(rowId, scope);
    if (!guard.ok) {
      return NextResponse.json(
        { success: false, error: guard.error },
        { status: guard.status },
      );
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("workout_exercises")
      .delete()
      .eq("id", rowId);
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
