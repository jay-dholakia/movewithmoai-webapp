import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { coachCanSeeProgram, getCoachScope } from "@/lib/server/coach-scope";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const body = await request.json();
    const {
      source_program_id, // UUID of the program to clone from
      new_plan_name,
      new_plan_id,
      assign_type = null, // "focus_moai" | "user"
      assign_to_id = null,
    } = body as {
      source_program_id?: string;
      new_plan_name?: string;
      new_plan_id?: string;
      assign_type?: "focus_moai" | "user" | null;
      assign_to_id?: string | null;
    };

    if (!source_program_id || !new_plan_id?.trim() || !new_plan_name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "source_program_id, new_plan_id, new_plan_name are required",
        },
        { status: 400 },
      );
    }
    if (!assign_type || !assign_to_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "assign_type and assign_to_id are required for coach duplicates.",
        },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Fetch source
    const { data: source, error: srcErr } = await admin
      .from("workout_programs")
      .select("*")
      .eq("id", source_program_id)
      .single();
    if (srcErr || !source) {
      return NextResponse.json(
        { success: false, error: "Source program not found" },
        { status: 404 },
      );
    }

    // Coach must be allowed to see the source
    if (
      !coachCanSeeProgram(scope, {
        created_by:
          (source as { created_by?: string | null }).created_by ?? null,
        assigned_focus_moai_id:
          (source as { assigned_focus_moai_id?: string | null })
            .assigned_focus_moai_id ?? null,
        assigned_user_id:
          (source as { assigned_user_id?: string | null }).assigned_user_id ??
          null,
      })
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Validate assign target is in scope
    if (assign_type === "focus_moai") {
      if (!scope.focusMoaiIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "You are not assigned to that focus moai." },
          { status: 403 },
        );
      }
    } else if (assign_type === "user") {
      if (!scope.allAssignableUserIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "That user is not in your coaching scope." },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "invalid assign_type" },
        { status: 400 },
      );
    }

    // Insert new program row (draft, unpublished, owned by coach)
    const { data: newProgram, error: insErr } = await admin
      .from("workout_programs")
      .insert({
        plan_id: new_plan_id.trim(),
        plan_name: new_plan_name.trim(),
        gender: source.gender,
        min_age: source.min_age,
        max_age: source.max_age,
        days_per_week: source.days_per_week,
        description: source.description,
        difficulty_level: source.difficulty_level,
        equipment_required: source.equipment_required ?? [],
        base_plan_id: source.plan_id,
        month_active: null,
        is_paid: false,
        is_deprecated: false,
        status: "draft",
        assigned_focus_moai_id:
          assign_type === "focus_moai" ? assign_to_id : null,
        assigned_user_id: assign_type === "user" ? assign_to_id : null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "A program with this plan_id already exists.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: insErr.message },
        { status: 400 },
      );
    }

    // Clone workouts + their exercises
    const { data: srcWorkouts } = await admin
      .from("workoutss")
      .select("*")
      .eq("plan_id", source.plan_id);

    for (const w of srcWorkouts || []) {
      const { data: newW, error: wErr } = await admin
        .from("workoutss")
        .insert({
          title: w.title,
          type: w.type,
          plan_id: new_plan_id.trim(),
          description: w.description,
          duration_minutes: w.duration_minutes,
          difficulty_level: w.difficulty_level,
          estimated_duration_minutes: w.estimated_duration_minutes,
          tags: w.tags,
          is_public: false,
          order_index: w.order_index,
          is_circuit: w.is_circuit,
          created_by: auth.userId,
        })
        .select()
        .single();
      if (wErr || !newW) continue;

      const { data: srcRows } = await admin
        .from("workout_exercises")
        .select("*")
        .eq("workout_template_id", w.id);

      for (const row of srcRows || []) {
        await admin.from("workout_exercises").insert({
          workout_template_id: newW.id,
          exercise_id: row.exercise_id,
          order_index: row.order_index,
          group_id: row.group_id,
          group_type: row.group_type,
          sets: row.sets,
          reps: row.reps,
          reps_display: row.reps_display,
          rest_seconds: row.rest_seconds,
          rest_display: row.rest_display,
          notes: row.notes,
        });
      }
    }

    // Same side-effects as create
    try {
      if (assign_type === "focus_moai") {
        const { data: fm } = await admin
          .from("focus_moais")
          .select("workout_focus_id")
          .eq("id", assign_to_id)
          .single();
        if (fm?.workout_focus_id) {
          await admin
            .from("workout_focus")
            .update({ workout_program_id: newProgram.id })
            .eq("id", fm.workout_focus_id);
        }
        const { data: members } = await admin
          .from("focus_moai_members")
          .select("user_id")
          .eq("focus_moai_id", assign_to_id)
          .eq("status", "active");
        const memberIds = (members || []).map((m) => m.user_id as string);
        if (memberIds.length > 0) {
          await admin
            .from("users")
            .update({ current_plan: newProgram.id })
            .in("id", memberIds);
        }
      } else {
        await admin
          .from("users")
          .update({ current_plan: newProgram.id })
          .eq("id", assign_to_id);
      }
    } catch (assignErr) {
      console.warn(
        "[coach duplicate] assignment side-effect failed:",
        assignErr,
      );
    }

    return NextResponse.json({ success: true, program: newProgram });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
