import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type FocusMoaiRef = { id: string; name: string; status: string };
type UserRef = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
};

type WorkoutFocusRow = {
  id: string;
  workout_program_id: string | null;
};

type FocusMoaiRow = {
  id: string;
  name: string;
  status: string | null;
  workout_focus_id: string | null;
};

export type ProgramAssignmentRow = {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  difficulty_level: string | null;
  is_paid: boolean;
  is_deprecated: boolean | null;
  days_per_week: number;
  created_at: string | null;
  // Direct scoping (on the program row itself)
  scoped_focus_moai: FocusMoaiRef | null;
  scoped_user: UserRef | null;
  // Indirect assignments
  focus_moais_via_workout_focus: FocusMoaiRef[];
  assigned_users: UserRef[];
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const includeDeprecated = searchParams.get("include_deprecated") === "true";
    const includeUnassigned = searchParams.get("include_unassigned") === "true";
    const q = (searchParams.get("q") || "").trim();

    const admin = getSupabaseAdmin();

    // 1. Load programs
    let query = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, status, difficulty_level, is_paid, is_deprecated, days_per_week, created_at, assigned_focus_moai_id, assigned_user_id",
      )
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      query = query.or("is_deprecated.is.null,is_deprecated.eq.false");
    }
    if (q.length > 0) {
      query = query.ilike("plan_name", `%${q}%`);
    }

    const { data: programs, error: pErr } = await query;
    if (pErr) {
      return NextResponse.json(
        { success: false, error: pErr.message },
        { status: 500 },
      );
    }
    const list = programs ?? [];
    const programIds = list.map((p) => p.id as string);

    if (programIds.length === 0) {
      return NextResponse.json({
        success: true,
        programs: [] as ProgramAssignmentRow[],
        stats: emptyStats(),
      });
    }

    // 2. workout_focus rows linking programs to focus moais
    const { data: wfData } = await admin
      .from("workout_focus")
      .select("id, workout_program_id")
      .in("workout_program_id", programIds);
    const workoutFocuses = (wfData || []) as WorkoutFocusRow[];

    const wfIdsByProgram = new Map<string, string[]>();
    for (const wf of workoutFocuses) {
      if (!wf.workout_program_id) continue;
      const arr = wfIdsByProgram.get(wf.workout_program_id) || [];
      arr.push(wf.id);
      wfIdsByProgram.set(wf.workout_program_id, arr);
    }

    // 3. focus_moais tied to those workout_focus rows
    const allWfIds = workoutFocuses.map((f) => f.id);
    let focusMoaiRows: FocusMoaiRow[] = [];
    if (allWfIds.length > 0) {
      const { data } = await admin
        .from("focus_moais")
        .select("id, name, status, workout_focus_id")
        .in("workout_focus_id", allWfIds);
      focusMoaiRows = (data || []) as FocusMoaiRow[];
    }

    // 4. Users currently on each program (users.current_plan → workout_programs.id)
    const { data: userRows } = await admin
      .from("users")
      .select("id, email, first_name, last_name, username, current_plan")
      .in("current_plan", programIds)
      .eq("is_deleted", false);

    const usersByProgram = new Map<string, UserRef[]>();
    for (const u of userRows || []) {
      const pid = (u as any).current_plan as string | null;
      if (!pid) continue;
      const arr = usersByProgram.get(pid) || [];
      arr.push({
        id: u.id as string,
        email: (u as any).email ?? null,
        first_name: (u as any).first_name ?? null,
        last_name: (u as any).last_name ?? null,
        username: (u as any).username ?? null,
      });
      usersByProgram.set(pid, arr);
    }

    // 5. Directly-scoped focus moais and users (from workout_programs itself)
    const directFocusMoaiIds = list
      .map((p) => (p as any).assigned_focus_moai_id as string | null)
      .filter((v): v is string => !!v);
    const directUserIds = list
      .map((p) => (p as any).assigned_user_id as string | null)
      .filter((v): v is string => !!v);

    const directFocusMoais = new Map<string, FocusMoaiRef>();
    if (directFocusMoaiIds.length > 0) {
      const { data } = await admin
        .from("focus_moais")
        .select("id, name, status")
        .in("id", directFocusMoaiIds);
      for (const fm of data || []) {
        directFocusMoais.set(fm.id as string, {
          id: fm.id as string,
          name: (fm as any).name as string,
          status: ((fm as any).status as string) || "unknown",
        });
      }
    }

    const directUsers = new Map<string, UserRef>();
    if (directUserIds.length > 0) {
      const { data } = await admin
        .from("users")
        .select("id, email, first_name, last_name, username")
        .in("id", directUserIds);
      for (const u of data || []) {
        directUsers.set(u.id as string, {
          id: u.id as string,
          email: (u as any).email ?? null,
          first_name: (u as any).first_name ?? null,
          last_name: (u as any).last_name ?? null,
          username: (u as any).username ?? null,
        });
      }
    }

    // 6. Assemble
    const assembled: ProgramAssignmentRow[] = list.map((p) => {
      const programId = p.id as string;
      const wfIds = wfIdsByProgram.get(programId) || [];
      const focusMoaisVia: FocusMoaiRef[] = focusMoaiRows
        .filter(
          (fm) => fm.workout_focus_id && wfIds.includes(fm.workout_focus_id),
        )
        .map((fm) => ({
          id: fm.id,
          name: fm.name,
          status: fm.status || "unknown",
        }));

      const scopedFocusMoaiId = (p as any).assigned_focus_moai_id as
        | string
        | null;
      const scopedUserId = (p as any).assigned_user_id as string | null;

      return {
        id: programId,
        plan_id: (p as any).plan_id as string,
        plan_name: (p as any).plan_name as string,
        status: ((p as any).status as string) || "draft",
        difficulty_level: ((p as any).difficulty_level as string) || null,
        is_paid: Boolean((p as any).is_paid),
        is_deprecated: (p as any).is_deprecated ?? null,
        days_per_week: Number((p as any).days_per_week ?? 0),
        created_at: ((p as any).created_at as string) || null,
        scoped_focus_moai: scopedFocusMoaiId
          ? (directFocusMoais.get(scopedFocusMoaiId) ?? null)
          : null,
        scoped_user: scopedUserId
          ? (directUsers.get(scopedUserId) ?? null)
          : null,
        focus_moais_via_workout_focus: focusMoaisVia,
        assigned_users: usersByProgram.get(programId) || [],
      };
    });

    const filtered = includeUnassigned
      ? assembled
      : assembled.filter(
          (r) =>
            r.scoped_focus_moai !== null ||
            r.scoped_user !== null ||
            r.focus_moais_via_workout_focus.length > 0 ||
            r.assigned_users.length > 0,
        );

    return NextResponse.json({
      success: true,
      programs: filtered,
      stats: computeStats(assembled),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[assignments GET]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function emptyStats() {
  return {
    total_programs: 0,
    programs_with_any_assignment: 0,
    total_focus_moais_assigned: 0,
    total_users_assigned: 0,
  };
}

function computeStats(rows: ProgramAssignmentRow[]) {
  const focusMoaiIds = new Set<string>();
  const userIds = new Set<string>();
  let withAny = 0;

  for (const r of rows) {
    if (r.scoped_focus_moai) focusMoaiIds.add(r.scoped_focus_moai.id);
    for (const fm of r.focus_moais_via_workout_focus) focusMoaiIds.add(fm.id);
    if (r.scoped_user) userIds.add(r.scoped_user.id);
    for (const u of r.assigned_users) userIds.add(u.id);

    if (
      r.scoped_focus_moai ||
      r.scoped_user ||
      r.focus_moais_via_workout_focus.length > 0 ||
      r.assigned_users.length > 0
    ) {
      withAny++;
    }
  }

  return {
    total_programs: rows.length,
    programs_with_any_assignment: withAny,
    total_focus_moais_assigned: focusMoaiIds.size,
    total_users_assigned: userIds.size,
  };
}
