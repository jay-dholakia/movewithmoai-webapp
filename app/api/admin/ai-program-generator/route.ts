import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { loadExerciseCandidatesForPrompt } from "@/lib/server/ai-exercise-candidates";
import {
  collectExerciseIdsFromProgramDraft,
  collectExerciseIdsFromWorkoutDraft,
  programDraftSchema,
  validateGroupContiguity,
  workoutDraftSchema,
  assertExerciseIdsExist,
} from "@/lib/server/ai-program-draft";
import {
  getOpenAIApiKey,
  getOpenAIEnvDebugInfo,
  openaiChatJsonContent,
  stripJsonFence,
} from "@/lib/server/openai-json";

export const runtime = "nodejs";

function buildSystemPrompt(mode: "program" | "workout"): string {
  const base =
    mode === "program"
      ? `You are a strength coach assistant for an admin tool. The user wants a full multi-day PROGRAM (several workout templates under one plan).

Return a single JSON object with this exact shape:
{
  "program": {
    "plan_id": "string, unique slug e.g. beginner_3day",
    "plan_name": "human-readable name",
    "gender": "All",
    "min_age": 0,
    "max_age": 120,
    "days_per_week": 3,
    "description": "string or null",
    "difficulty_level": "string or null"
  },
  "workouts": [
    {
      "title": "string",
      "type": "upper" | "lower" | "full" | "bodyweight",
      "order_index": 1,
      "description": "string or null",
      "is_circuit": false,
      "exercises": [ /* exercise objects */ ]
    }
  ]
}`
      : `You are a strength coach assistant for an admin tool. The user wants a single WORKOUT template (one session).

Return a single JSON object with this exact shape:
{
  "workout": {
    "title": "string",
    "type": "upper" | "lower" | "full" | "bodyweight",
    "description": "string or null",
    "is_circuit": false,
    "plan_id": "string to attach to an existing program, or null for unassigned library workout",
    "order_index": null
  },
  "exercises": [ /* exercise objects */ ]
}`;

  const exerciseBlock = `
Each exercise object must be:
{
  "exercise_id": "<uuid>",
  "order_index": 1,
  "sets": 3,
  "reps": 10,
  "reps_display": "10" or "8-12" or null,
  "rest_seconds": 60,
  "rest_display": null,
  "notes": null,
  "group_type": null | "circuit" | "superset",
  "group_id": null | <positive integer>
}

Circuit / superset rules (must match how the app stores rows):
- For standalone moves: "group_type": null and "group_id": null.
- To group moves: give them the SAME "group_id" (e.g. 1, 2, 3 per block) and the SAME "group_type".
- "superset": paired exercises (often alternating A1/A2 style).
- "circuit": multiple moves done in sequence in a round before resting.
- Exercises in the same group must be CONSECUTIVE in order_index (no other exercise between them).
- Every exercise_id MUST appear exactly in the ALLOWED_EXERCISES list provided by the user. Never invent UUIDs or names not in that list; choose the closest exercise from the list.

Output JSON only, no markdown fences.`;

  return `${base}\n${exerciseBlock}`;
}

async function resolveExerciseNames(
  admin: ReturnType<typeof getSupabaseAdmin>,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const { data } = await admin
    .from("exercises")
    .select("id, name")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id as string] = row.name as string;
  }
  return map;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    if (!getOpenAIApiKey()) {
      const dev =
        process.env.NODE_ENV === "development" ||
        process.env.VERCEL_ENV === "preview";
      const envDebug = dev ? getOpenAIEnvDebugInfo() : undefined;
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY to .env or .env.local in the project root (no spaces around '='), then restart the dev server.",
          ...(envDebug ? { envDebug } : {}),
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const mode = body?.mode as string;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const targetPlanId =
      typeof body?.target_plan_id === "string"
        ? body.target_plan_id.trim()
        : "";

    if (mode !== "program" && mode !== "workout") {
      return NextResponse.json(
        { success: false, error: 'mode must be "program" or "workout"' },
        { status: 400 },
      );
    }
    if (!prompt || prompt.length < 8) {
      return NextResponse.json(
        { success: false, error: "prompt is required (at least 8 characters)" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const candidates = await loadExerciseCandidatesForPrompt(
      admin,
      prompt,
      280,
    );
    const catalogLines = candidates.map((c) => `${c.id}|${c.name}`).join("\n");

    const userParts = [
      `MODE: ${mode}`,
      prompt,
      "",
      "ALLOWED_EXERCISES (use only these exercise_id values, one per line as id|name):",
      catalogLines,
    ];
    if (mode === "workout" && targetPlanId) {
      userParts.push(
        "",
        `If appropriate, set workout.plan_id to "${targetPlanId}" so the template attaches to that program; otherwise use null.`,
      );
    }

    const content = await openaiChatJsonContent([
      { role: "system", content: buildSystemPrompt(mode) },
      { role: "user", content: userParts.join("\n") },
    ]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(content));
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Model returned invalid JSON",
          raw: content.slice(0, 2000),
        },
        { status: 422 },
      );
    }

    const validationErrors: string[] = [];
    let draft: unknown = parsed;

    if (mode === "program") {
      const zr = programDraftSchema.safeParse(parsed);
      if (!zr.success) {
        validationErrors.push(
          ...zr.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        );
      } else {
        draft = zr.data;
        const { missing } = await assertExerciseIdsExist(
          admin,
          collectExerciseIdsFromProgramDraft(zr.data),
        );
        if (missing.length) {
          validationErrors.push(
            `Unknown exercise_id(s) not in database: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "…" : ""}`,
          );
        }
        zr.data.workouts.forEach((w, wi) => {
          const ge = validateGroupContiguity(w.exercises);
          ge.forEach((e) =>
            validationErrors.push(`Workout #${wi + 1} (${w.title}): ${e}`),
          );
        });
      }
    } else {
      const zr = workoutDraftSchema.safeParse(parsed);
      if (!zr.success) {
        validationErrors.push(
          ...zr.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        );
      } else {
        draft = zr.data;
        const { missing } = await assertExerciseIdsExist(
          admin,
          collectExerciseIdsFromWorkoutDraft(zr.data),
        );
        if (missing.length) {
          validationErrors.push(
            `Unknown exercise_id(s) not in database: ${missing.join(", ")}`,
          );
        }
        validateGroupContiguity(zr.data.exercises).forEach((e) =>
          validationErrors.push(e),
        );
        if (zr.data.workout.plan_id) {
          const { data: prog } = await admin
            .from("workout_programs")
            .select("plan_id")
            .eq("plan_id", zr.data.workout.plan_id)
            .maybeSingle();
          if (!prog) {
            validationErrors.push(
              `workout.plan_id "${zr.data.workout.plan_id}" does not match an existing program — set to null or a valid plan_id.`,
            );
          }
        }
      }
    }

    const allIds: string[] = [];
    const walk = (obj: unknown) => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.forEach(walk);
        return;
      }
      const o = obj as Record<string, unknown>;
      if (typeof o.exercise_id === "string") allIds.push(o.exercise_id);
      for (const v of Object.values(o)) walk(v);
    };
    walk(parsed);

    const resolvedNames = await resolveExerciseNames(admin, allIds);

    return NextResponse.json({
      success: true,
      mode,
      draft,
      draftJson: JSON.stringify(draft, null, 2),
      validationErrors,
      resolvedNames,
      candidateCount: candidates.length,
      note:
        "Review and edit the JSON below before using Apply — nothing is saved until you confirm Apply.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai-program-generator POST]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
