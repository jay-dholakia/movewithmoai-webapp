import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { source_workout_id, target_plan_id, order_index } = body;

    if (!source_workout_id || !target_plan_id || order_index == null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "source_workout_id, target_plan_id, and order_index are required",
        },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: prog } = await admin
      .from("workout_programs")
      .select("plan_id")
      .eq("plan_id", String(target_plan_id).trim())
      .maybeSingle();
    if (!prog) {
      return NextResponse.json(
        { success: false, error: "Target program not found" },
        { status: 400 },
      );
    }
    const { data: source, error: srcError } = await admin
      .from("workoutss")
      .select("*")
      .eq("id", source_workout_id)
      .single();

    if (srcError || !source) {
      return NextResponse.json(
        { success: false, error: "Source workout not found" },
        { status: 404 },
      );
    }

    const { data: existing } = await admin
      .from("workoutss")
      .select("id")
      .eq("plan_id", target_plan_id)
      .eq("order_index", order_index)
      .maybeSingle();

    if (existing) {
      await admin
        .from("workout_exercises")
        .delete()
        .eq("workout_template_id", existing.id);
      await admin.from("workoutss").delete().eq("id", existing.id);
    }

    const {
      title,
      type,
      description,
      is_circuit,
      difficulty_level,
      estimated_duration_minutes,
      tags,
    } = source;

    const { data: newWorkout, error: insertError } = await admin
      .from("workoutss")
      .insert({
        title,
        type,
        description,
        is_circuit: Boolean(is_circuit),
        difficulty_level: difficulty_level ?? null,
        estimated_duration_minutes: estimated_duration_minutes ?? null,
        tags: Array.isArray(tags) ? tags : null,
        is_public: true,
        plan_id: String(target_plan_id).trim(),
        order_index: Number(order_index),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[duplicate workout] insert:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 },
      );
    }

    const { data: sourceExercises, error: exError } = await admin
      .from("workout_exercises")
      .select("*")
      .eq("workout_template_id", source_workout_id)
      .order("order_index", { ascending: true });

    if (exError) {
      console.warn("[duplicate workout] exercises fetch:", exError);
    }

    if (sourceExercises && sourceExercises.length > 0) {
      const rows = sourceExercises.map((ex) => {
        const {
          id: _exId,
          workout_template_id: _wtId,
          created_at: _exCa,
          updated_at: _exUa,
          ...exRest
        } = ex;
        return {
          ...exRest,
          workout_template_id: newWorkout.id,
        };
      });

      const { error: exInsertError } = await admin
        .from("workout_exercises")
        .insert(rows);

      if (exInsertError) {
        console.warn("[duplicate workout] exercises insert:", exInsertError);
      }
    }

    return NextResponse.json({ success: true, workout: newWorkout });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[duplicate workout]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
