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
    const { source_program_id, new_plan_name, new_plan_id } = body;

    if (!source_program_id) {
      return NextResponse.json(
        { success: false, error: "source_program_id is required" },
        { status: 400 },
      );
    }
    if (!new_plan_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "new_plan_name is required" },
        { status: 400 },
      );
    }
    if (!new_plan_id?.trim()) {
      return NextResponse.json(
        { success: false, error: "new_plan_id is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Get source program
    const { data: source, error: srcError } = await admin
      .from("workout_programs")
      .select("*")
      .eq("id", source_program_id)
      .single();

    if (srcError || !source) {
      return NextResponse.json(
        { success: false, error: "Source program not found" },
        { status: 404 },
      );
    }

    // 2. Check plan_id uniqueness
    const { data: existing } = await admin
      .from("workout_programs")
      .select("id")
      .eq("plan_id", new_plan_id.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A program with this plan_id already exists" },
        { status: 409 },
      );
    }

    // 3. Insert new program
    const {
      id: _id,
      plan_id: _pid,
      plan_name: _pn,
      created_at: _ca,
      updated_at: _ua,
      ...rest
    } = source;

    const { data: newProgram, error: insertError } = await admin
      .from("workout_programs")
      .insert({
        ...rest,
        plan_id: new_plan_id.trim(),
        plan_name: new_plan_name.trim(),
        status: "draft",
        is_deprecated: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[duplicate] program insert:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "A program with this plan_id already exists",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 },
      );
    }

    // 4. Get source workouts
    const { data: sourceWorkouts, error: wError } = await admin
      .from("workoutss")
      .select("*")
      .eq("plan_id", source.plan_id)
      .order("order_index", { ascending: true });

    if (wError) {
      console.warn("[duplicate] workouts fetch:", wError);
    }

    // 5. Copy each workout and its exercises
    for (const sw of sourceWorkouts || []) {
      const {
        id: swId,
        plan_id: _swPlan,
        created_at: _swCa,
        updated_at: _swUa,
        ...workoutRest
      } = sw;

      const { data: newWorkout, error: nwError } = await admin
        .from("workoutss")
        .insert({
          ...workoutRest,
          plan_id: new_plan_id.trim(),
        })
        .select("id")
        .single();

      if (nwError) {
        console.warn("[duplicate] workout insert:", nwError);
        continue;
      }

      // Copy workout exercises
      const { data: sourceExercises, error: exError } = await admin
        .from("workout_exercises")
        .select("*")
        .eq("workout_template_id", swId)
        .order("order_index", { ascending: true });

      if (exError) {
        console.warn("[duplicate] exercises fetch:", exError);
        continue;
      }

      if (sourceExercises && sourceExercises.length > 0) {
        const exerciseRows = sourceExercises.map((ex) => {
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
          .insert(exerciseRows);

        if (exInsertError) {
          console.warn("[duplicate] exercises insert:", exInsertError);
        }
      }
    }

    return NextResponse.json({ success: true, program: newProgram });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[duplicate]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
