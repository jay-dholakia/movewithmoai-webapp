// app/api/coach/workout-programs/generate/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

type GeneratedExercise = {
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: number | null;
  reps_display: string | null;
  rest_seconds: number;
  group_id: number | null;
  group_type: string | null;
  notes: string | null;
};

type GeneratedWorkout = {
  title: string;
  type: string;
  order_index: number;
  estimated_duration_minutes: number;
  exercises: GeneratedExercise[];
};

type GeneratedProgram = {
  plan_name: string;
  description: string;
  difficulty_level: string;
  workouts: GeneratedWorkout[];
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const body = await request.json();
    const { prompt, difficulty_level, assign_type, assign_to_id } = body as {
      prompt?: string;
      difficulty_level?: string;
      assign_type?: "focus_moai" | "user";
      assign_to_id?: string;
    };

    if (!prompt?.trim() || prompt.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Prompt must be at least 10 characters" },
        { status: 400 },
      );
    }
    if (!assign_type || !assign_to_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "assign_type and assign_to_id are required for coach generation.",
        },
        { status: 400 },
      );
    }
    if (assign_type === "focus_moai") {
      if (!scope.focusMoaiIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "Focus moai not in your scope." },
          { status: 403 },
        );
      }
    } else if (assign_type === "user") {
      if (!scope.allAssignableUserIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "User not in your scope." },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "invalid assign_type" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Fetch exercise catalog (compact: id, name, muscle_group, equipment)
    const { data: exercises, error: exError } = await admin
      .from("exercises")
      .select("id, name, muscle_group, category, equipment")
      .order("name", { ascending: true });

    if (exError) {
      console.error("[coach generate] exercises fetch:", exError);
      return NextResponse.json(
        { success: false, error: "Failed to load exercise catalog" },
        { status: 500 },
      );
    }

    const catalog = (exercises || [])
      .map((e) => {
        const equip = Array.isArray(e.equipment) ? e.equipment.join(", ") : "";
        return `${e.id}|${e.name}|${e.muscle_group || ""}|${e.category || ""}|${equip}`;
      })
      .join("\n");

    const systemPrompt = `You are a fitness programming expert. Create a 5-day workout program based on the coach's request.

IMPORTANT: You MUST select exercises ONLY from the provided exercise catalog below. Each line is: id|name|muscle_group|category|equipment

EXERCISE CATALOG:
${catalog}

Return a JSON object with this exact structure:
{
  "plan_name": "string - a clear, short name for the program",
  "description": "string - 1-2 sentence description",
  "difficulty_level": "Beginner" | "Intermediate" | "Advanced",
  "workouts": [
    {
      "title": "string - e.g. Day 1 - Push",
      "type": "strength",
      "order_index": 1,
      "estimated_duration_minutes": 45,
      "exercises": [
        {
          "exercise_id": "uuid from catalog",
          "order_index": 1,
          "sets": 4,
          "reps": 8,
          "reps_display": "8",
          "rest_seconds": 90,
          "group_id": null,
          "group_type": null,
          "notes": null
        }
      ]
    }
  ]
}

Rules:
- Always create exactly 5 workouts with order_index 1 through 5
- For supersets: give grouped exercises the same group_id (integer starting at 1) and set group_type to "superset"
- For circuits: same group_id, group_type "circuit"
- Individual exercises: group_id null, group_type null
- group_id resets per workout (each workout starts numbering from 1)
- Use reps_display for ranges like "8-12" or time like "30s", put the lower number in reps
- Only use exercise IDs that exist in the catalog
- Pick 5-8 exercises per workout${difficulty_level ? `\n- Target difficulty: ${difficulty_level}` : ""}

Return ONLY valid JSON. No markdown, no explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt.trim() },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { success: false, error: "AI returned empty response" },
        { status: 500 },
      );
    }

    let generated: GeneratedProgram;
    try {
      generated = JSON.parse(raw) as GeneratedProgram;
    } catch {
      console.error("[coach generate] JSON parse failed:", raw);
      return NextResponse.json(
        { success: false, error: "AI returned invalid JSON" },
        { status: 500 },
      );
    }

    if (
      !generated.plan_name ||
      !Array.isArray(generated.workouts) ||
      generated.workouts.length !== 5
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "AI did not generate a valid 5-workout program",
        },
        { status: 500 },
      );
    }

    const validExIds = new Set((exercises || []).map((e) => e.id));

    const basePlanId = slugify(generated.plan_name);
    const planId = `${basePlanId}_${Date.now().toString(36)}`;

    // Insert program — status ALWAYS draft, assignment fields are recorded
    // intent only. No workout_focus linking or users.current_plan update
    // happens here — that side effect fires only on publish (see PATCH
    // /api/coach/workout-programs/[planId] → applyProgramAssignment).
    const { data: program, error: pgError } = await admin
      .from("workout_programs")
      .insert({
        plan_id: planId,
        plan_name: generated.plan_name,
        gender: "All",
        min_age: 0,
        max_age: 120,
        days_per_week: 5,
        description: generated.description || null,
        difficulty_level:
          generated.difficulty_level || difficulty_level || null,
        equipment_required: [],
        is_paid: true,
        is_deprecated: false,
        status: "draft",
        assigned_focus_moai_id:
          assign_type === "focus_moai" ? assign_to_id : null,
        assigned_user_id: assign_type === "user" ? assign_to_id : null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (pgError) {
      console.error("[coach generate] program insert:", pgError);
      return NextResponse.json(
        { success: false, error: pgError.message },
        { status: 500 },
      );
    }

    // Insert workouts and their exercises
    for (const w of generated.workouts) {
      const { data: workout, error: wError } = await admin
        .from("workoutss")
        .insert({
          title: w.title,
          type: w.type || "strength",
          plan_id: planId,
          order_index: w.order_index,
          estimated_duration_minutes: w.estimated_duration_minutes || null,
          is_public: false,
          created_by: auth.userId,
        })
        .select("id")
        .single();

      if (wError) {
        console.error("[coach generate] workout insert:", wError);
        continue;
      }

      const validExercises = (w.exercises || []).filter(
        (ex) => ex.exercise_id && validExIds.has(ex.exercise_id),
      );

      if (validExercises.length > 0) {
        const exerciseRows = validExercises.map((ex) => ({
          workout_template_id: workout.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets || 3,
          reps: ex.reps ?? null,
          reps_display: ex.reps_display || (ex.reps ? String(ex.reps) : null),
          rest_seconds: ex.rest_seconds ?? 60,
          rest_display: ex.rest_seconds ? `${ex.rest_seconds}s` : null,
          group_id: ex.group_id ?? null,
          group_type: ex.group_type ?? null,
          notes: ex.notes ?? null,
        }));

        const { error: exInsertError } = await admin
          .from("workout_exercises")
          .insert(exerciseRows);

        if (exInsertError) {
          console.error("[coach generate] exercises insert:", exInsertError);
        }
      }
    }

    // Compute equipment_required from inserted exercises
    const { data: workoutIds } = await admin
      .from("workoutss")
      .select("id")
      .eq("plan_id", planId);

    if (workoutIds && workoutIds.length > 0) {
      const { data: allExData } = await admin
        .from("workout_exercises")
        .select("exercise:exercises(equipment)")
        .in(
          "workout_template_id",
          workoutIds.map((w) => w.id),
        );

      if (allExData) {
        const equipSet = new Set<string>();
        for (const row of allExData) {
          const equip = (row as { exercise?: { equipment?: string[] } })
            .exercise?.equipment;
          if (Array.isArray(equip)) equip.forEach((e) => equipSet.add(e));
        }
        if (equipSet.size > 0) {
          await admin
            .from("workout_programs")
            .update({ equipment_required: [...equipSet].sort() })
            .eq("id", program.id);
        }
      }
    }

    return NextResponse.json({ success: true, program });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[coach generate]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
