import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

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

export type CoachProgramAssignmentRow = {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  difficulty_level: string | null;
  is_paid: boolean;
  is_deprecated: boolean | null;
  days_per_week: number;
  created_at: string | null;
  is_mine: boolean;
  scoped_focus_moai: FocusMoaiRef | null;
  scoped_user: UserRef | null;
  focus_moais_via_workout_focus: FocusMoaiRef[];
  assigned_users: UserRef[];
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { searchParams } = new URL(request.url);
    const includeDeprecated = searchParams.get("include_deprecated") === "true";
    const includeUnassigned = searchParams.get("include_unassigned") === "true";
    const q = (searchParams.get("q") || "").trim();

    // If a coach has zero focus moais, zero circles, zero users, and hasn't
    // created any programs, they have nothing to see — bail early.
    if (
      scope.focusMoaiIds.length === 0 &&
      scope.allAssignableUserIds.length === 0
    ) {
      // …unless they've created programs, in which case those still show.
      // We keep going so a coach who created a general/unassigned program
      // still sees it (it just won't have any chips).
    }

    const admin = getSupabaseAdmin();

    // 1. Base program pull — visible to this coach.
    // Coach-side visibility (per your rule): programs they created +
    // programs scoped to one of their focus moais/users.
    let query = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, status, difficulty_level, is_paid, is_deprecated, days_per_week, created_at, assigned_focus_moai_id, assigned_user_id, created_by",
      )
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      query = query.or("is_deprecated.is.null,is_deprecated.eq.false");
    }
    if (q.length > 0) {
      query = query.ilike("plan_name", `%${q}%`);
    }

    const { data: allPrograms, error: pErr } = await query;
    if (pErr) {
      return NextResponse.json(
        { success: false, error: pErr.message },
        { status: 500 },
      );
    }

    // 2. Precompute the workout_focus → program mapping. We'll need this to
    // decide which programs are "assigned to one of my focus moais via
    // workout_focus" before we can filter the visibility set.
    const allProgramIds = (allPrograms || []).map((p) => p.id as string);

    let workoutFocuses: WorkoutFocusRow[] = [];
    if (allProgramIds.length > 0) {
      const { data } = await admin
        .from("workout_focus")
        .select("id, workout_program_id")
        .in("workout_program_id", allProgramIds);
      workoutFocuses = (data || []) as WorkoutFocusRow[];
    }
    const wfIdsByProgram = new Map<string, string[]>();
    for (const wf of workoutFocuses) {
      if (!wf.workout_program_id) continue;
      const arr = wfIdsByProgram.get(wf.workout_program_id) || [];
      arr.push(wf.id);
      wfIdsByProgram.set(wf.workout_program_id, arr);
    }

    // 3. Load focus_moais tied to those workout_focus rows.
    const allWfIds = workoutFocuses.map((w) => w.id);
    let focusMoaiRows: FocusMoaiRow[] = [];
    if (allWfIds.length > 0) {
      const { data } = await admin
        .from("focus_moais")
        .select("id, name, status, workout_focus_id")
        .in("workout_focus_id", allWfIds);
      focusMoaiRows = (data || []) as FocusMoaiRow[];
    }

    // 4. Load users currently on each program.
    const usersByProgram = new Map<string, UserRef[]>();
    if (allProgramIds.length > 0) {
      const { data } = await admin
        .from("users")
        .select("id, email, first_name, last_name, username, current_plan")
        .in("current_plan", allProgramIds)
        .eq("is_deleted", false);

      for (const u of data || []) {
        const pid = (u as { current_plan?: string | null }).current_plan;
        if (!pid) continue;
        const arr = usersByProgram.get(pid) || [];
        arr.push({
          id: u.id as string,
          email: (u as { email?: string | null }).email ?? null,
          first_name: (u as { first_name?: string | null }).first_name ?? null,
          last_name: (u as { last_name?: string | null }).last_name ?? null,
          username: (u as { username?: string | null }).username ?? null,
        });
        usersByProgram.set(pid, arr);
      }
    }

    // 5. Load the directly-scoped focus moais / users that appear on the
    //    program rows themselves (the assigned_* columns).
    const directFocusMoaiIds = Array.from(
      new Set(
        (allPrograms || [])
          .map(
            (p) =>
              (p as { assigned_focus_moai_id?: string | null })
                .assigned_focus_moai_id,
          )
          .filter((v): v is string => !!v),
      ),
    );
    const directUserIds = Array.from(
      new Set(
        (allPrograms || [])
          .map(
            (p) => (p as { assigned_user_id?: string | null }).assigned_user_id,
          )
          .filter((v): v is string => !!v),
      ),
    );

    const directFocusMoais = new Map<string, FocusMoaiRef>();
    if (directFocusMoaiIds.length > 0) {
      const { data } = await admin
        .from("focus_moais")
        .select("id, name, status")
        .in("id", directFocusMoaiIds);
      for (const fm of data || []) {
        directFocusMoais.set(fm.id as string, {
          id: fm.id as string,
          name: (fm as { name?: string }).name as string,
          status:
            ((fm as { status?: string | null }).status as string) || "unknown",
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
          email: (u as { email?: string | null }).email ?? null,
          first_name: (u as { first_name?: string | null }).first_name ?? null,
          last_name: (u as { last_name?: string | null }).last_name ?? null,
          username: (u as { username?: string | null }).username ?? null,
        });
      }
    }

    const focusMoaiSet = new Set(scope.focusMoaiIds);
    const userSet = new Set(scope.allAssignableUserIds);

    // 6. Assemble. For each program:
    //    - Filter chips to only in-scope focus moais / users
    //    - Decide whether the program itself is in the coach's scope
    const assembled: CoachProgramAssignmentRow[] = [];

    for (const p of allPrograms || []) {
      const programId = p.id as string;
      const created_by =
        (p as { created_by?: string | null }).created_by ?? null;
      const isMine = created_by === scope.userId;

      // Direct scoping (from assigned_* columns) — only include if in scope
      const directFmId =
        (p as { assigned_focus_moai_id?: string | null })
          .assigned_focus_moai_id ?? null;
      const directUserId =
        (p as { assigned_user_id?: string | null }).assigned_user_id ?? null;

      const scoped_focus_moai =
        directFmId && focusMoaiSet.has(directFmId)
          ? (directFocusMoais.get(directFmId) ?? null)
          : null;
      const scoped_user =
        directUserId && userSet.has(directUserId)
          ? (directUsers.get(directUserId) ?? null)
          : null;

      // Focus moais via workout_focus — only in-scope ones
      const wfIds = wfIdsByProgram.get(programId) || [];
      const focus_moais_via_workout_focus: FocusMoaiRef[] = focusMoaiRows
        .filter(
          (fm) =>
            fm.workout_focus_id &&
            wfIds.includes(fm.workout_focus_id) &&
            focusMoaiSet.has(fm.id),
        )
        .map((fm) => ({
          id: fm.id,
          name: fm.name,
          status: fm.status || "unknown",
        }));

      // Assigned users — only in-scope ones
      const assigned_users = (usersByProgram.get(programId) || []).filter((u) =>
        userSet.has(u.id),
      );

      const hasAnyInScopeAssignment =
        !!scoped_focus_moai ||
        !!scoped_user ||
        focus_moais_via_workout_focus.length > 0 ||
        assigned_users.length > 0;

      // Include if either: it's the coach's own program, or has at least one
      // in-scope assignment. Coach never sees programs that only belong to
      // other coaches.
      if (!isMine && !hasAnyInScopeAssignment) continue;

      assembled.push({
        id: programId,
        plan_id: (p as { plan_id?: string }).plan_id as string,
        plan_name: (p as { plan_name?: string }).plan_name as string,
        status: ((p as { status?: string | null }).status as string) || "draft",
        difficulty_level:
          ((p as { difficulty_level?: string | null }).difficulty_level as
            | string
            | null) || null,
        is_paid: Boolean((p as { is_paid?: boolean }).is_paid),
        is_deprecated:
          (p as { is_deprecated?: boolean | null }).is_deprecated ?? null,
        days_per_week: Number(
          (p as { days_per_week?: number | null }).days_per_week ?? 0,
        ),
        created_at:
          ((p as { created_at?: string | null }).created_at as string) || null,
        is_mine: isMine,
        scoped_focus_moai,
        scoped_user,
        focus_moais_via_workout_focus,
        assigned_users,
      });
    }

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
    console.error("[coach/assignments GET]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function computeStats(rows: CoachProgramAssignmentRow[]) {
  const focusMoaiIds = new Set<string>();
  const userIds = new Set<string>();
  let withAny = 0;
  let mine = 0;

  for (const r of rows) {
    if (r.is_mine) mine++;
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
    programs_i_created: mine,
    total_focus_moais_assigned: focusMoaiIds.size,
    total_users_assigned: userIds.size,
  };
}
