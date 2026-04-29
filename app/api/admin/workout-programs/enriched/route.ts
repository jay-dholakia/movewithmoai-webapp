import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import type { EnrichedWorkoutProgramRow } from "@/lib/types/workout-builder";

type WorkoutFocusRow = { id: string; name: string; plan_id?: string | null };

function focusIdsForProgram(
  planId: string,
  planName: string,
  focusList: WorkoutFocusRow[],
): string[] {
  const ids = new Set<string>();
  for (const f of focusList) {
    if (f.plan_id && String(f.plan_id) === planId) ids.add(f.id);
    else if (
      (f.plan_id == null || f.plan_id === "") &&
      f.name &&
      f.name === planName
    ) {
      ids.add(f.id);
    }
  }
  return [...ids];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const includeDeprecated =
      searchParams.get("include_deprecated") === "true";

    const admin = getSupabaseAdmin();

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, gender, min_age, max_age, days_per_week, description, difficulty_level, equipment_required, base_plan_id, is_deprecated, month_active, created_at, updated_at",
      )
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    const { data: programs, error: programsError } = await q;

    if (programsError) {
      console.error("[workout-programs/enriched] programs:", programsError);
      return NextResponse.json(
        { success: false, error: programsError.message },
        { status: 500 },
      );
    }

    const list = programs ?? [];
    const planIds = list.map((p) => p.plan_id as string);

    let focusList: WorkoutFocusRow[] = [];
    const fq = await admin.from("workout_focus").select("id, name, plan_id");
    if (fq.error) {
      const fb = await admin.from("workout_focus").select("id, name");
      if (fb.error) {
        console.warn("[workout-programs/enriched] workout_focus:", fb.error);
      } else {
        focusList = (fb.data || []).map((r: WorkoutFocusRow) => ({
          ...r,
          plan_id: null,
        }));
      }
    } else {
      focusList = (fq.data || []) as WorkoutFocusRow[];
    }

    const { data: focusMoaiRows, error: fmError } = await admin
      .from("focus_moais")
      .select("id, name, status, workout_focus_id");

    if (fmError) {
      console.warn("[workout-programs/enriched] focus_moais:", fmError);
    }

    const uwByPlan = new Map<string, Set<string>>();
    if (planIds.length > 0) {
      const { data: uwRows, error: uwError } = await admin
        .from("user_workouts")
        .select("user_id, base_plan_id")
        .in("base_plan_id", planIds);
      if (uwError) {
        console.warn("[workout-programs/enriched] user_workouts:", uwError);
      } else {
        for (const row of uwRows || []) {
          const bid = row.base_plan_id as string | null;
          const uid = row.user_id as string | null;
          if (!bid || !uid) continue;
          if (!uwByPlan.has(bid)) uwByPlan.set(bid, new Set());
          uwByPlan.get(bid)!.add(uid);
        }
      }
    }

    const userIdsByFocus = new Map<string, Set<string>>();
    const { data: usersData, error: usersError } = await admin
      .from("users")
      .select("id, focus")
      .not("focus", "is", null);
    if (usersError) {
      console.warn("[workout-programs/enriched] users focus:", usersError);
    } else {
      for (const u of usersData || []) {
        const fid = u.focus as string | null;
        const uid = u.id as string | null;
        if (!fid || !uid) continue;
        if (!userIdsByFocus.has(fid)) userIdsByFocus.set(fid, new Set());
        userIdsByFocus.get(fid)!.add(uid);
      }
    }

    const enriched: EnrichedWorkoutProgramRow[] = list.map((p) => {
      const planId = p.plan_id as string;
      const planName = p.plan_name as string;
      const fIds = focusIdsForProgram(planId, planName, focusList);

      const focusMoais: EnrichedWorkoutProgramRow["focus_moais"] = [];
      for (const fm of focusMoaiRows || []) {
        const wfid = fm.workout_focus_id as string | null;
        if (!wfid || !fIds.includes(wfid)) continue;
        focusMoais.push({
          id: fm.id as string,
          name: fm.name as string,
          status: (fm.status as string) || "unknown",
        });
      }

      const fromUw = uwByPlan.get(planId) || new Set<string>();
      const fromFocus = new Set<string>();
      for (const fid of fIds) {
        const s = userIdsByFocus.get(fid);
        if (s) s.forEach((id) => fromFocus.add(id));
      }
      const assigned = new Set([...fromUw, ...fromFocus]);

      return {
        ...p,
        focus_moais: focusMoais,
        assigned_user_count: assigned.size,
      } as EnrichedWorkoutProgramRow;
    });

    return NextResponse.json({ success: true, programs: enriched });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[workout-programs/enriched]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
