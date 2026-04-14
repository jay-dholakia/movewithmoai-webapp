import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import {
  assertExerciseIdsExist,
  collectExerciseIdsFromProgramDraft,
  collectExerciseIdsFromWorkoutDraft,
  parseProgramDraftForApply,
  parseWorkoutDraftForApply,
  validateGroupContiguity,
} from "@/lib/server/ai-program-draft";

export const runtime = "nodejs";

function exerciseInsertRow(
  workoutId: string,
  ex: {
    exercise_id: string;
    order_index: number;
    sets: number;
    reps?: number | null;
    reps_display?: string | null;
    rest_seconds?: number | null;
    rest_display?: string | null;
    notes?: string | null;
    group_type?: "circuit" | "superset" | null;
    group_id?: number | null;
  },
) {
  return {
    workout_template_id: workoutId,
    exercise_id: ex.exercise_id,
    order_index: ex.order_index,
    sets: ex.sets,
    reps: ex.reps === undefined || ex.reps === null ? null : Number(ex.reps),
    reps_display: ex.reps_display ?? null,
    rest_seconds:
      ex.rest_seconds === undefined || ex.rest_seconds === null
        ? null
        : Number(ex.rest_seconds),
    rest_display: ex.rest_display ?? null,
    notes: ex.notes ?? null,
    group_id:
      ex.group_id === undefined || ex.group_id === null
        ? null
        : Number(ex.group_id),
    group_type: ex.group_type ?? null,
  };
}

async function rollbackProgram(
  admin: ReturnType<typeof getSupabaseAdmin>,
  planId: string,
  workoutIds: string[],
) {
  if (workoutIds.length > 0) {
    await admin
      .from("workout_exercises")
      .delete()
      .in("workout_template_id", workoutIds);
    await admin.from("workoutss").delete().in("id", workoutIds);
  }
  await admin.from("workout_programs").delete().eq("plan_id", planId);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const mode = body?.mode as string;
    const draftRaw = body?.draft;

    if (mode !== "program" && mode !== "workout") {
      return NextResponse.json(
        { success: false, error: 'mode must be "program" or "workout"' },
        { status: 400 },
      );
    }
    if (draftRaw === undefined || draftRaw === null) {
      return NextResponse.json(
        { success: false, error: "draft is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    if (mode === "program") {
      let draft;
      try {
        draft = parseProgramDraftForApply(draftRaw);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Invalid draft";
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }

      const { missing } = await assertExerciseIdsExist(
        admin,
        collectExerciseIdsFromProgramDraft(draft),
      );
      if (missing.length) {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown exercise_id(s): ${missing.join(", ")}`,
          },
          { status: 400 },
        );
      }

      for (let i = 0; i < draft.workouts.length; i++) {
        const w = draft.workouts[i];
        const ge = validateGroupContiguity(w.exercises);
        if (ge.length) {
          return NextResponse.json(
            {
              success: false,
              error: `Workout "${w.title}": ${ge.join("; ")}`,
            },
            { status: 400 },
          );
        }
      }

      const planId = draft.program.plan_id.trim();
      const { data: existing } = await admin
        .from("workout_programs")
        .select("plan_id")
        .eq("plan_id", planId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Program plan_id "${planId}" already exists. Change plan_id in the draft or delete the existing program first.`,
          },
          { status: 409 },
        );
      }

      const { data: programRow, error: progErr } = await admin
        .from("workout_programs")
        .insert({
          plan_id: planId,
          plan_name: draft.program.plan_name.trim(),
          gender: draft.program.gender ?? "All",
          min_age: Number(draft.program.min_age ?? 0),
          max_age: Number(draft.program.max_age ?? 120),
          days_per_week: Number(draft.program.days_per_week ?? 3),
          description: draft.program.description ?? null,
          difficulty_level: draft.program.difficulty_level ?? null,
          equipment_required: [],
          is_deprecated: false,
        })
        .select("plan_id")
        .single();

      if (progErr || !programRow) {
        console.error("[ai apply program insert]", progErr);
        return NextResponse.json(
          { success: false, error: progErr?.message ?? "Failed to create program" },
          { status: 400 },
        );
      }

      const createdWorkoutIds: string[] = [];

      try {
        for (let i = 0; i < draft.workouts.length; i++) {
          const w = draft.workouts[i];
          const orderIndex = w.order_index ?? i + 1;
          const { data: wo, error: wErr } = await admin
            .from("workoutss")
            .insert({
              title: w.title.trim(),
              type: w.type,
              plan_id: planId,
              order_index: orderIndex,
              description: w.description ?? null,
              is_circuit: Boolean(w.is_circuit),
            })
            .select("id")
            .single();

          if (wErr || !wo) {
            throw new Error(wErr?.message ?? "Failed to create workout");
          }
          createdWorkoutIds.push(wo.id as string);

          const rows = w.exercises.map((ex) =>
            exerciseInsertRow(wo.id as string, ex),
          );
          const { error: exErr } = await admin
            .from("workout_exercises")
            .insert(rows);
          if (exErr) {
            throw new Error(exErr.message);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Apply failed";
        await rollbackProgram(admin, planId, createdWorkoutIds);
        console.error("[ai apply program rollback]", e);
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        plan_id: planId,
        workout_ids: createdWorkoutIds,
        message: "Program, workouts, and exercise rows created.",
      });
    }

    let workoutDraft;
    try {
      workoutDraft = parseWorkoutDraftForApply(draftRaw);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid draft";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const { missing } = await assertExerciseIdsExist(
      admin,
      collectExerciseIdsFromWorkoutDraft(workoutDraft),
    );
    if (missing.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown exercise_id(s): ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const ge = validateGroupContiguity(workoutDraft.exercises);
    if (ge.length) {
      return NextResponse.json(
        { success: false, error: ge.join("; ") },
        { status: 400 },
      );
    }

    const pid = workoutDraft.workout.plan_id?.trim();
    const planIdToUse =
      pid && pid.length > 0 ? pid : null;

    if (planIdToUse) {
      const { data: prog } = await admin
        .from("workout_programs")
        .select("plan_id")
        .eq("plan_id", planIdToUse)
        .maybeSingle();
      if (!prog) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid plan_id "${planIdToUse}" — program not found.`,
          },
          { status: 400 },
        );
      }
    }

    const { data: wo, error: wErr } = await admin
      .from("workoutss")
      .insert({
        title: workoutDraft.workout.title.trim(),
        type: workoutDraft.workout.type,
        plan_id: planIdToUse,
        order_index:
          workoutDraft.workout.order_index === undefined ||
          workoutDraft.workout.order_index === null
            ? null
            : Number(workoutDraft.workout.order_index),
        description: workoutDraft.workout.description ?? null,
        is_circuit: Boolean(workoutDraft.workout.is_circuit),
      })
      .select("id")
      .single();

    if (wErr || !wo) {
      console.error("[ai apply workout insert]", wErr);
      return NextResponse.json(
        { success: false, error: wErr?.message ?? "Failed to create workout" },
        { status: 400 },
      );
    }

    const wid = wo.id as string;
    const rows = workoutDraft.exercises.map((ex) =>
      exerciseInsertRow(wid, ex),
    );
    const { error: exErr } = await admin.from("workout_exercises").insert(rows);
    if (exErr) {
      await admin.from("workoutss").delete().eq("id", wid);
      console.error("[ai apply workout exercises]", exErr);
      return NextResponse.json(
        { success: false, error: exErr.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      workout_id: wid,
      message: "Workout template and exercise rows created.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai-program-generator apply POST]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
