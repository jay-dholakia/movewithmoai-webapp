import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import {
  equipmentStringsFromExerciseRow,
  mergeEquipmentList,
} from "@/lib/program-equipment";
import { isEquipmentAdaptedWorkoutTitle } from "@/lib/workout-admin-filters";

type Ctx = { params: Promise<{ planId: string }> };

/**
 * Sets `workout_programs.equipment_required` from all exercises referenced by
 * workouts in this program (excluding equipment-adapted clone templates).
 */
export async function POST(_request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(_request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const admin = getSupabaseAdmin();

    const { data: program, error: progErr } = await admin
      .from("workout_programs")
      .select("plan_id")
      .eq("plan_id", decoded)
      .maybeSingle();

    if (progErr || !program) {
      return NextResponse.json(
        { success: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const { data: workouts, error: wErr } = await admin
      .from("workoutss")
      .select("id, title")
      .eq("plan_id", decoded);

    if (wErr) {
      console.error("[recompute-equipment] workoutss", wErr);
      return NextResponse.json(
        { success: false, error: wErr.message },
        { status: 500 },
      );
    }

    const templateIds = (workouts ?? [])
      .filter(
        (w: { id: string; title?: string | null }) =>
          !isEquipmentAdaptedWorkoutTitle(w.title ?? null),
      )
      .map((w: { id: string }) => w.id);

    let exerciseIds: string[] = [];
    if (templateIds.length > 0) {
      const { data: weRows, error: weErr } = await admin
        .from("workout_exercises")
        .select("exercise_id")
        .in("workout_template_id", templateIds);

      if (weErr) {
        console.error("[recompute-equipment] workout_exercises", weErr);
        return NextResponse.json(
          { success: false, error: weErr.message },
          { status: 500 },
        );
      }

      exerciseIds = [
        ...new Set(
          (weRows ?? [])
            .map((r: { exercise_id: string | null }) => r.exercise_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
    }

    const collected: string[] = [];
    if (exerciseIds.length > 0) {
      let exRows: Record<string, unknown>[] | null = null;
      const full = await admin
        .from("exercises")
        .select("id, equipment, category")
        .in("id", exerciseIds);

      if (full.error) {
        const catOnly = await admin
          .from("exercises")
          .select("id, category")
          .in("id", exerciseIds);
        if (catOnly.error) {
          console.error("[recompute-equipment] exercises", catOnly.error);
          return NextResponse.json(
            { success: false, error: catOnly.error.message },
            { status: 500 },
          );
        }
        exRows = catOnly.data ?? [];
      } else {
        exRows = full.data ?? [];
      }

      for (const row of exRows) {
        collected.push(
          ...equipmentStringsFromExerciseRow({
            equipment: row.equipment,
            category:
              typeof row.category === "string" ? row.category : null,
          }),
        );
      }
    }

    const equipment_required = mergeEquipmentList(collected);

    const { data: updated, error: upErr } = await admin
      .from("workout_programs")
      .update({ equipment_required })
      .eq("plan_id", decoded)
      .select()
      .single();

    if (upErr) {
      return NextResponse.json(
        { success: false, error: upErr.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      program: updated,
      equipment_required,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
