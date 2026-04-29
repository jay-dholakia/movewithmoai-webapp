import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

const GROUP_TYPES = new Set(["circuit", "superset"]);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id: workoutId } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: rows, error } = await admin
      .from("workout_exercises")
      .select(
        "id, workout_template_id, exercise_id, order_index, sets, reps, reps_display, rest_seconds, rest_display, notes, group_id, group_type",
      )
      .eq("workout_template_id", workoutId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[workout exercises GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const list = rows ?? [];
    const exIds = [
      ...new Set(
        list.map((r) => r.exercise_id).filter(Boolean) as string[],
      ),
    ];
    let nameById = new Map<string, string>();
    if (exIds.length > 0) {
      const { data: exRows } = await admin
        .from("exercises")
        .select("id, name")
        .in("id", exIds);
      nameById = new Map(
        (exRows ?? []).map((e) => [e.id, e.name as string]),
      );
    }

    const exercises = list.map((r) => ({
      ...r,
      exercises: r.exercise_id
        ? { id: r.exercise_id, name: nameById.get(r.exercise_id) ?? "?" }
        : null,
    }));

    return NextResponse.json({ success: true, exercises });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id: workoutId } = await context.params;
    const body = await request.json();
    const {
      exercise_id,
      order_index,
      sets,
      reps = null,
      reps_display = null,
      rest_seconds = null,
      rest_display = null,
      notes = null,
      group_id = null,
      group_type = null,
    } = body;

    if (!exercise_id || typeof exercise_id !== "string") {
      return NextResponse.json(
        { success: false, error: "exercise_id is required" },
        { status: 400 },
      );
    }
    if (order_index === undefined || order_index === null) {
      return NextResponse.json(
        { success: false, error: "order_index is required" },
        { status: 400 },
      );
    }
    if (sets === undefined || sets === null || Number(sets) < 1) {
      return NextResponse.json(
        { success: false, error: "sets is required (positive integer)" },
        { status: 400 },
      );
    }

    let gt: string | null = null;
    if (group_type != null && group_type !== "") {
      if (!GROUP_TYPES.has(String(group_type))) {
        return NextResponse.json(
          { success: false, error: "group_type must be circuit, superset, or empty" },
          { status: 400 },
        );
      }
      gt = String(group_type);
    }

    const admin = getSupabaseAdmin();

    const { data: ex } = await admin
      .from("exercises")
      .select("id")
      .eq("id", exercise_id)
      .maybeSingle();
    if (!ex) {
      return NextResponse.json(
        { success: false, error: "Exercise not found" },
        { status: 400 },
      );
    }

    const { data: w } = await admin
      .from("workoutss")
      .select("id")
      .eq("id", workoutId)
      .maybeSingle();
    if (!w) {
      return NextResponse.json(
        { success: false, error: "Workout template not found" },
        { status: 404 },
      );
    }

    const insert = {
      workout_template_id: workoutId,
      exercise_id,
      order_index: Number(order_index),
      sets: Number(sets),
      reps: reps === null || reps === "" ? null : Number(reps),
      reps_display,
      rest_seconds:
        rest_seconds === null || rest_seconds === ""
          ? null
          : Number(rest_seconds),
      rest_display,
      notes,
      group_id:
        group_id === null || group_id === "" ? null : Number(group_id),
      group_type: gt,
    };

    const { data: created, error } = await admin
      .from("workout_exercises")
      .insert(insert)
      .select(
        "id, workout_template_id, exercise_id, order_index, sets, reps, reps_display, rest_seconds, rest_display, notes, group_id, group_type",
      )
      .single();

    if (error) {
      console.error("[workout exercises POST]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    const { data: exName } = await admin
      .from("exercises")
      .select("id, name")
      .eq("id", exercise_id)
      .single();

    const row = {
      ...created,
      exercises: exName
        ? { id: exName.id, name: exName.name }
        : { id: exercise_id, name: "?" },
    };

    return NextResponse.json({ success: true, row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
