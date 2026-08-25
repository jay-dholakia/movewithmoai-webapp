import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import {
  coachCanEditProgram,
  coachCanSeeProgram,
  getCoachScope,
} from "@/lib/server/coach-scope";

type WorkoutFocusRow = {
  id: string;
  name: string;
  workout_program_id: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { searchParams } = new URL(request.url);
    const includeDeprecated = searchParams.get("include_deprecated") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );

    const admin = getSupabaseAdmin();

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, gender, min_age, max_age, days_per_week, description, difficulty_level, equipment_required, base_plan_id, is_deprecated, is_paid, status, month_active, assigned_focus_moai_id, assigned_user_id, created_at, updated_at, created_by",
      )
      .order("is_deprecated", { ascending: true, nullsFirst: true })
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    const { data: allPrograms, error: programsError } = await q;
    if (programsError) {
      return NextResponse.json(
        { success: false, error: programsError.message },
        { status: 500 },
      );
    }

    const visible = (allPrograms || []).filter((p) =>
      coachCanSeeProgram(scope, {
        created_by: (p as { created_by?: string | null }).created_by ?? null,
        assigned_focus_moai_id:
          (p as { assigned_focus_moai_id?: string | null })
            .assigned_focus_moai_id ?? null,
        assigned_user_id:
          (p as { assigned_user_id?: string | null }).assigned_user_id ?? null,
      }),
    );

    const total = visible.length;
    const from = (page - 1) * pageSize;
    const list = visible.slice(from, from + pageSize);
    const programUuids = list.map((p) => p.id as string);

    let focusList: WorkoutFocusRow[] = [];
    if (programUuids.length > 0) {
      const { data } = await admin
        .from("workout_focus")
        .select("id, name, workout_program_id")
        .in("workout_program_id", programUuids);
      focusList = (data || []) as WorkoutFocusRow[];
    }
    const focusIdsByProgram = new Map<string, string[]>();
    for (const f of focusList) {
      if (!f.workout_program_id) continue;
      const arr = focusIdsByProgram.get(f.workout_program_id) || [];
      arr.push(f.id);
      focusIdsByProgram.set(f.workout_program_id, arr);
    }

    const allFocusIds = focusList.map((f) => f.id);
    let focusMoaiRows: Array<{
      id: string;
      name: string;
      status: string;
      workout_focus_id: string;
    }> = [];
    if (allFocusIds.length > 0) {
      const { data } = await admin
        .from("focus_moais")
        .select("id, name, status, workout_focus_id")
        .in("workout_focus_id", allFocusIds);
      focusMoaiRows = (data || []) as typeof focusMoaiRows;
    }

    const userCountByProgram = new Map<string, Set<string>>();
    if (programUuids.length > 0) {
      const { data } = await admin
        .from("users")
        .select("id, current_plan")
        .in("current_plan", programUuids);
      for (const u of data || []) {
        const pid = (u as { current_plan?: string | null }).current_plan;
        const uid = (u as { id?: string | null }).id;
        if (!pid || !uid) continue;
        if (!userCountByProgram.has(pid))
          userCountByProgram.set(pid, new Set());
        userCountByProgram.get(pid)!.add(uid);
      }
    }

    const enriched = list.map((p) => {
      const programId = p.id as string;
      const fIds = focusIdsByProgram.get(programId) || [];
      const focus_moais = focusMoaiRows
        .filter((fm) => fIds.includes(fm.workout_focus_id))
        .map((fm) => ({
          id: fm.id,
          name: fm.name,
          status: fm.status || "unknown",
        }));

      const assigned = userCountByProgram.get(programId) || new Set<string>();
      const created_by =
        (p as { created_by?: string | null }).created_by ?? null;

      return {
        ...p,
        focus_moais,
        assigned_user_count: assigned.size,
        can_edit: coachCanEditProgram(scope, { created_by }),
        is_mine: created_by === scope.userId,
      };
    });

    return NextResponse.json({
      success: true,
      programs: enriched,
      total,
      page,
      page_size: pageSize,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
