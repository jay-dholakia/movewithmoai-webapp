import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope, coachCanSeeProgram } from "@/lib/server/coach-scope";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const body = await request.json();
    const { source_workout_id, target_plan_id, order_index } = body as {
      source_workout_id?: string;
      target_plan_id?: string;
      order_index?: number;
    };

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

    // Target program must exist AND be owned by the coach — a coach can only
    // add workouts to programs they created.
    const { data: prog } = await admin
      .from("workout_programs")
      .select("plan_id, created_by")
      .eq("plan_id", String(target_plan_id).trim())
      .maybeSingle();
    if (!prog) {
      return NextResponse.json(
        { success: false, error: "Target program not found" },
        { status: 400 },
      );
    }
    if ((prog as { created_by?: string | null }).created_by !== scope.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only duplicate into programs you created.",
        },
        { status: 403 },
      );
    }

    // Source workout must exist. If it's assigned to a program, the coach
    // must be able to see that program; otherwise it's from the free/shared
    // library and any coach can copy it.
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

    const sourcePlanId =
      (source as { plan_id?: string | null }).plan_id ?? null;
    if (sourcePlanId) {
      const { data: sourceProgram } = await admin
        .from("workout_programs")
        .select("plan_id, created_by, assigned_focus_moai_id, assigned_user_id")
        .eq("plan_id", sourcePlanId)
        .maybeSingle();
      if (
        sourceProgram &&
        !coachCanSeeProgram(scope, {
          created_by:
            (sourceProgram as { created_by?: string | null }).created_by ??
            null,
          assigned_focus_moai_id:
            (sourceProgram as { assigned_focus_moai_id?: string | null })
              .assigned_focus_moai_id ?? null,
          assigned_user_id:
            (sourceProgram as { assigned_user_id?: string | null })
              .assigned_user_id ?? null,
        })
      ) {
        return NextResponse.json(
          { success: false, error: "You can't duplicate that workout." },
          { status: 403 },
        );
      }
    }

    // Replace whatever workout is currently sitting at that day slot.
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
        // Coach-created content is private, not part of the shared library.
        is_public: false,
        plan_id: String(target_plan_id).trim(),
        order_index: Number(order_index),
        created_by: auth.userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[coach duplicate workout] insert:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 },
      );
    }

    // Copy the exercises across, dropping fields that must not carry over.
    const { data: sourceExercises, error: exError } = await admin
      .from("workout_exercises")
      .select("*")
      .eq("workout_template_id", source_workout_id)
      .order("order_index", { ascending: true });

    if (exError) {
      console.warn("[coach duplicate workout] exercises fetch:", exError);
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
        console.warn(
          "[coach duplicate workout] exercises insert:",
          exInsertError,
        );
      }
    }

    return NextResponse.json({ success: true, workout: newWorkout });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[coach duplicate workout]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
