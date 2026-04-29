import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

const GROUP_TYPES = new Set(["circuit", "superset"]);

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const admin = getSupabaseAdmin();
    const patch: Record<string, unknown> = {};

    if ("order_index" in body && body.order_index != null) {
      patch.order_index = Number(body.order_index);
    }
    if ("sets" in body && body.sets != null) {
      patch.sets = Number(body.sets);
    }
    if ("reps" in body) {
      patch.reps =
        body.reps === null || body.reps === "" ? null : Number(body.reps);
    }
    if ("reps_display" in body) patch.reps_display = body.reps_display;
    if ("rest_seconds" in body) {
      patch.rest_seconds =
        body.rest_seconds === null || body.rest_seconds === ""
          ? null
          : Number(body.rest_seconds);
    }
    if ("rest_display" in body) patch.rest_display = body.rest_display;
    if ("notes" in body) patch.notes = body.notes;
    if ("group_id" in body) {
      patch.group_id =
        body.group_id === null || body.group_id === ""
          ? null
          : Number(body.group_id);
    }
    if ("group_type" in body) {
      const gt = body.group_type;
      if (gt === null || gt === "") {
        patch.group_type = null;
      } else if (GROUP_TYPES.has(String(gt))) {
        patch.group_type = String(gt);
      } else {
        return NextResponse.json(
          { success: false, error: "group_type must be circuit, superset, or empty" },
          { status: 400 },
        );
      }
    }

    if ("exercise_id" in body && body.exercise_id) {
      const { data: ex } = await admin
        .from("exercises")
        .select("id")
        .eq("id", body.exercise_id)
        .maybeSingle();
      if (!ex) {
        return NextResponse.json(
          { success: false, error: "Exercise not found" },
          { status: 400 },
        );
      }
      patch.exercise_id = body.exercise_id;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: updated, error } = await admin
      .from("workout_exercises")
      .update(patch)
      .eq("id", id)
      .select(
        "id, workout_template_id, exercise_id, order_index, sets, reps, reps_display, rest_seconds, rest_display, notes, group_id, group_type",
      )
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    const exId = updated?.exercise_id;
    let exercises = null;
    if (exId) {
      const { data: exName } = await admin
        .from("exercises")
        .select("id, name")
        .eq("id", exId)
        .single();
      if (exName) exercises = { id: exName.id, name: exName.name };
    }

    return NextResponse.json({
      success: true,
      row: { ...updated, exercises },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("workout_exercises").delete().eq("id", id);

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
