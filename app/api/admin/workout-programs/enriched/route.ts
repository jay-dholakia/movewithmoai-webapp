import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import type { EnrichedWorkoutProgramRow } from "@/lib/types/workout-builder";

type WorkoutFocusRow = {
  id: string;
  name: string;
  workout_program_id: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const includeDeprecated = searchParams.get("include_deprecated") === "true";

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, gender, min_age, max_age, days_per_week, description, difficulty_level, equipment_required, base_plan_id, is_deprecated, is_paid, status, month_active, assigned_focus_moai_id, assigned_user_id, created_at, updated_at",
        { count: "exact" },
      )
      .order("is_deprecated", { ascending: true, nullsFirst: true })
      .order("plan_name", { ascending: true })
      .range(from, to);

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    const filterFocusMoaiId = searchParams.get("focus_moai_id");
    const filterUserId = searchParams.get("user_id");
    const scope = searchParams.get("scope");

    if (filterFocusMoaiId) {
      q = q.or(
        `and(assigned_focus_moai_id.is.null,assigned_user_id.is.null),assigned_focus_moai_id.eq.${filterFocusMoaiId}`,
      );
    } else if (filterUserId) {
      q = q.or(
        `and(assigned_focus_moai_id.is.null,assigned_user_id.is.null),assigned_user_id.eq.${filterUserId}`,
      );
    } else if (scope === "general") {
      q = q.is("assigned_focus_moai_id", null).is("assigned_user_id", null);
    }

    const { data: programs, error: programsError, count } = await q;

    if (programsError) {
      console.error("[workout-programs/enriched] programs:", programsError);
      return NextResponse.json(
        { success: false, error: programsError.message },
        { status: 500 },
      );
    }

    const list = programs ?? [];
    const programUuids = list.map((p) => p.id as string);

    // ── workout_focus: links via workout_program_id (program UUID) ──
    let focusList: WorkoutFocusRow[] = [];
    if (programUuids.length > 0) {
      const { data, error } = await admin
        .from("workout_focus")
        .select("id, name, workout_program_id")
        .in("workout_program_id", programUuids);
      if (error) {
        console.warn("[workout-programs/enriched] workout_focus:", error);
      } else {
        focusList = (data || []) as WorkoutFocusRow[];
      }
    }

    // Build a map: program UUID → workout_focus ids
    const focusIdsByProgram = new Map<string, string[]>();
    for (const f of focusList) {
      if (!f.workout_program_id) continue;
      const arr = focusIdsByProgram.get(f.workout_program_id) || [];
      arr.push(f.id);
      focusIdsByProgram.set(f.workout_program_id, arr);
    }

    // ── focus_moais ──
    const allFocusIds = focusList.map((f) => f.id);
    let focusMoaiRows: Array<{
      id: string;
      name: string;
      status: string;
      workout_focus_id: string;
    }> = [];

    if (allFocusIds.length > 0) {
      const { data, error } = await admin
        .from("focus_moais")
        .select("id, name, status, workout_focus_id")
        .in("workout_focus_id", allFocusIds);
      if (error) {
        console.warn("[workout-programs/enriched] focus_moais:", error);
      } else {
        focusMoaiRows = (data || []) as typeof focusMoaiRows;
      }
    }

    // ── Assigned users via users.current_plan (program UUID) ──
    const userCountByProgram = new Map<string, Set<string>>();
    if (programUuids.length > 0) {
      const { data, error } = await admin
        .from("users")
        .select("id, current_plan")
        .in("current_plan", programUuids);
      if (error) {
        console.warn("[workout-programs/enriched] users current_plan:", error);
      } else {
        for (const u of data || []) {
          const pid = u.current_plan as string | null;
          const uid = u.id as string | null;
          if (!pid || !uid) continue;
          if (!userCountByProgram.has(pid))
            userCountByProgram.set(pid, new Set());
          userCountByProgram.get(pid)!.add(uid);
        }
      }
    }

    const enriched: EnrichedWorkoutProgramRow[] = list.map((p) => {
      const programId = p.id as string;
      const fIds = focusIdsByProgram.get(programId) || [];

      const focusMoais: EnrichedWorkoutProgramRow["focus_moais"] = [];
      for (const fm of focusMoaiRows) {
        if (fIds.includes(fm.workout_focus_id)) {
          focusMoais.push({
            id: fm.id,
            name: fm.name,
            status: fm.status || "unknown",
          });
        }
      }

      const assigned = userCountByProgram.get(programId) || new Set<string>();

      return {
        ...p,
        focus_moais: focusMoais,
        assigned_user_count: assigned.size,
      } as EnrichedWorkoutProgramRow;
    });

    return NextResponse.json({
      success: true,
      programs: enriched,
      total: count ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[workout-programs/enriched]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
