import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { coachCanEditProgram, getCoachScope } from "@/lib/server/coach-scope";

type Ctx = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);

    const admin = getSupabaseAdmin();

    const { data: program, error: pErr } = await admin
      .from("workout_programs")
      .select("id, plan_id, created_by")
      .eq("plan_id", decoded)
      .single();
    if (pErr || !program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }
    if (
      !coachCanEditProgram(scope, {
        created_by:
          (program as { created_by?: string | null }).created_by ?? null,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only refresh equipment for programs you created.",
        },
        { status: 403 },
      );
    }

    // 1. Get workouts in this program (excluding equipment-adapted clones)
    const { data: workouts } = await admin
      .from("workoutss")
      .select("id, title")
      .eq("plan_id", decoded);

    const workoutIds = (workouts || [])
      .filter(
        (w) =>
          !(w.title as string | null)
            ?.toLowerCase()
            .includes("adapted to your equipment"),
      )
      .map((w) => w.id as string);

    if (workoutIds.length === 0) {
      const { data: updated } = await admin
        .from("workout_programs")
        .update({ equipment_required: [] })
        .eq("plan_id", decoded)
        .select()
        .single();
      return NextResponse.json({ success: true, program: updated });
    }

    // 2. All exercise rows in those workouts
    const { data: rows } = await admin
      .from("workout_exercises")
      .select("exercise_id")
      .in("workout_template_id", workoutIds);

    const exerciseIds = Array.from(
      new Set(
        (rows || [])
          .map((r) => (r as { exercise_id?: string | null }).exercise_id)
          .filter((v): v is string => !!v),
      ),
    );

    // 3. Their equipment + category
    let equipmentSet = new Set<string>();
    if (exerciseIds.length > 0) {
      const { data: exs } = await admin
        .from("exercises")
        .select("id, equipment, category")
        .in("id", exerciseIds);
      for (const ex of exs || []) {
        const eq = (ex as { equipment?: string[] | null }).equipment;
        if (Array.isArray(eq) && eq.length > 0) {
          for (const item of eq) if (item) equipmentSet.add(item);
        } else {
          const cat = (ex as { category?: string | null }).category;
          if (cat) equipmentSet.add(cat);
        }
      }
    }

    const equipment_required = Array.from(equipmentSet).sort();

    const { data: updated, error: uErr } = await admin
      .from("workout_programs")
      .update({ equipment_required })
      .eq("plan_id", decoded)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json(
        { success: false, error: uErr.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, program: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
