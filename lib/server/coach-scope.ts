import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type CoachScope = {
  coachId: string;
  userId: string;
  focusMoaiIds: string[]; // focus moais assigned to this coach
  circleIds: string[]; // regular moais this coach coaches
  directUserIds: string[]; // users directly subscribed with assigned_coach_id
  allAssignableUserIds: string[]; // directUserIds ∪ members of the above moais
};

export async function getCoachScope(
  coachId: string,
  userId: string,
): Promise<CoachScope> {
  const admin = getSupabaseAdmin();

  const { data: focusMoaiRows } = await admin
    .from("focus_moais")
    .select("id")
    .eq("coach_id", coachId);
  const focusMoaiIds = (focusMoaiRows || []).map((r) => r.id as string);

  const { data: circleSubs } = await admin
    .from("moai_coach_subscriptions")
    .select("moai_id")
    .eq("coach_id", coachId)
    .eq("status", "active");
  const circleIds = Array.from(
    new Set(
      (circleSubs || [])
        .map((r) => r.moai_id as string | null)
        .filter((v): v is string => !!v),
    ),
  );

  const { data: directSubs } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("assigned_coach_id", coachId)
    .in("status", ["active", "trial"]);
  const directUserIds = Array.from(
    new Set(
      (directSubs || [])
        .map((r) => r.user_id as string | null)
        .filter((v): v is string => !!v),
    ),
  );

  const memberIds = new Set<string>(directUserIds);

  if (focusMoaiIds.length > 0) {
    const { data: fm } = await admin
      .from("focus_moai_members")
      .select("user_id")
      .in("focus_moai_id", focusMoaiIds)
      .eq("status", "active");
    for (const r of fm || []) {
      const uid = (r as { user_id?: string | null }).user_id;
      if (uid) memberIds.add(uid);
    }
  }

  if (circleIds.length > 0) {
    const { data: cm } = await admin
      .from("circle_members")
      .select("user_id")
      .in("circle_id", circleIds)
      .eq("status", "active");
    for (const r of cm || []) {
      const uid = (r as { user_id?: string | null }).user_id;
      if (uid) memberIds.add(uid);
    }
  }

  return {
    coachId,
    userId,
    focusMoaiIds,
    circleIds,
    directUserIds,
    allAssignableUserIds: Array.from(memberIds),
  };
}

/** Is this program visible to this coach in list/read views? */
export function coachCanSeeProgram(
  scope: CoachScope,
  program: {
    created_by: string | null;
    assigned_focus_moai_id: string | null;
    assigned_user_id: string | null;
  },
): boolean {
  // Own programs — always
  if (program.created_by && program.created_by === scope.userId) return true;
  // General programs (no scoping) — always
  if (!program.assigned_focus_moai_id && !program.assigned_user_id) return true;
  // Scoped to one of my focus moais
  if (
    program.assigned_focus_moai_id &&
    scope.focusMoaiIds.includes(program.assigned_focus_moai_id)
  )
    return true;
  // Scoped to one of my users
  if (
    program.assigned_user_id &&
    scope.allAssignableUserIds.includes(program.assigned_user_id)
  )
    return true;
  return false;
}

/** Can this coach edit/delete this program? */
export function coachCanEditProgram(
  scope: CoachScope,
  program: { created_by: string | null },
): boolean {
  return !!program.created_by && program.created_by === scope.userId;
}
