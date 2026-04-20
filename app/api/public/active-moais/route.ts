import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

type WorkoutFocusJoin = { id: string; name: string } | null;

type CoachJoin = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
} | null;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** "Coach {firstName}" — uses `first_name` only; falls back to first word of `name`. */
function coachPublicLabel(
  c: CoachJoin | CoachJoin[] | null | undefined,
): string | null {
  if (c == null) return null;
  const coach = Array.isArray(c) ? c[0] : c;
  if (!coach) return null;
  const first = (coach.first_name || "").trim();
  if (first) return `Coach ${first}`;
  const firstFromName = (coach.name || "").trim().split(/\s+/)[0];
  if (firstFromName) return `Coach ${firstFromName}`;
  return "Coach";
}

export async function GET() {
  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      {
        success: true,
        items: [],
        unavailable: true,
      },
      { status: 200 },
    );
  }

  const { data: focusRows, error: focusErr } = await admin
    .from("focus_moais")
    .select(
      `
      id,
      name,
      max_members,
      description,
      workout_focus_id,
      workout_focus ( id, name ),
      coaches ( id, name, first_name, last_name, profile_image_url )
    `,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (focusErr) {
    console.error("[public/active-moais] focus_moais:", focusErr);
  }

  const { data: focusMemberRows, error: focusMemErr } = await admin
    .from("focus_moai_members")
    .select("focus_moai_id")
    .eq("status", "active");

  if (focusMemErr) {
    console.error("[public/active-moais] focus_moai_members:", focusMemErr);
  }

  const focusMembersByMoai = new Map<string, number>();
  for (const row of focusMemberRows || []) {
    const id = row.focus_moai_id as string;
    if (!id) continue;
    focusMembersByMoai.set(id, (focusMembersByMoai.get(id) || 0) + 1);
  }

  const { data: circleRows, error: circleErr } = await admin
    .from("circles")
    .select("id, name, min_members")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (circleErr) {
    console.error("[public/active-moais] circles:", circleErr);
  }

  const circles = (circleRows || []) as {
    id: string;
    name: string | null;
    min_members: number | null;
  }[];
  const circleIds = circles.map((c) => c.id);

  const coachMoaiIds = new Set<string>();
  if (circleIds.length > 0) {
    const { data: subs, error: subsErr } = await admin
      .from("moai_coach_subscriptions")
      .select("moai_id")
      .eq("status", "active")
      .in("moai_id", circleIds);

    if (subsErr) {
      console.error("[public/active-moais] moai_coach_subscriptions:", subsErr);
    }
    for (const s of subs || []) {
      const mid = s.moai_id as string | undefined;
      if (mid) coachMoaiIds.add(mid);
    }
  }

  type MemberAvatar = { imageUrl: string | null; initial: string };

  type CircleMemberRow = {
    circle_id: string;
    user_id?: string | null;
    joined_at?: string | null;
    users:
      | { profile_picture_url?: string | null; first_name?: string | null }
      | { profile_picture_url?: string | null; first_name?: string | null }[]
      | null;
  };

  const circleMembersById = new Map<string, number>();
  const avatarsByCircle = new Map<string, MemberAvatar[]>();
  const byCircle = new Map<string, CircleMemberRow[]>();

  if (circleIds.length > 0) {
    const { data: memRows, error: memErr } = await admin
      .from("circle_members")
      .select(
        `
        circle_id,
        user_id,
        joined_at,
        users ( profile_picture_url, first_name )
      `,
      )
      .eq("status", "active")
      .in("circle_id", circleIds);

    if (memErr) {
      console.error("[public/active-moais] circle_members:", memErr);
    }

    for (const row of (memRows || []) as CircleMemberRow[]) {
      const id = row.circle_id;
      if (!id) continue;
      circleMembersById.set(id, (circleMembersById.get(id) || 0) + 1);
      const list = byCircle.get(id) ?? [];
      list.push(row);
      byCircle.set(id, list);
    }

    for (const [circleId, rows] of byCircle) {
      rows.sort((a, b) => {
        const ta = a.joined_at ? new Date(a.joined_at).getTime() : 0;
        const tb = b.joined_at ? new Date(b.joined_at).getTime() : 0;
        return ta - tb;
      });
      const avatars: MemberAvatar[] = [];
      for (const row of rows.slice(0, 10)) {
        const uRaw = row.users;
        const u = Array.isArray(uRaw) ? uRaw[0] : uRaw;
        const url = (u?.profile_picture_url || "").trim() || null;
        const first = (u?.first_name || "").trim();
        const initial =
          first.charAt(0).toUpperCase() ||
          (url ? "·" : "?");
        avatars.push({ imageUrl: url, initial });
      }
      avatarsByCircle.set(circleId, avatars);
    }
  }

  /** Completed workout_sessions for all active members of a circle (same idea as coach leaderboard). */
  const completedWorkoutsByCircle = new Map<string, number>();
  if (byCircle.size > 0) {
    await Promise.all(
      [...byCircle.keys()].map(async (circleId) => {
        if ((circleMembersById.get(circleId) || 0) < 3) return;
        const userIds = [
          ...new Set(
            (byCircle.get(circleId) || [])
              .map((r) => r.user_id)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        if (userIds.length === 0) {
          completedWorkoutsByCircle.set(circleId, 0);
          return;
        }
        const { count, error: wsErr } = await admin
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .in("user_id", userIds)
          .eq("status", "completed");
        if (wsErr) {
          console.error(
            "[public/active-moais] workout_sessions count:",
            circleId,
            wsErr,
          );
          completedWorkoutsByCircle.set(circleId, 0);
          return;
        }
        completedWorkoutsByCircle.set(circleId, count ?? 0);
      }),
    );
  }

  type PublicItem = {
    id: string;
    kind: "focus" | "social";
    memberCount: number;
    maxMembers: number | null;
    /** Workout focus name (focus only), optional subtitle context */
    theme: string | null;
    /** Display name: focus_moais.name or circles.name */
    moaiName: string | null;
    withCoach: boolean | null;
    description: string | null;
    /** e.g. "Coach Jay" */
    coachName: string | null;
    coachImageUrl: string | null;
    /** Social Moai: active members’ avatars (max 10, same order as in-app) */
    memberAvatars: MemberAvatar[];
    /** Social: sum of completed workout_sessions across active members (omit on focus) */
    moaiCompletedWorkouts?: number;
  };

  const items: PublicItem[] = [];

  for (const row of focusRows || []) {
    const wfRaw = row.workout_focus as WorkoutFocusJoin | WorkoutFocusJoin[];
    const wf = Array.isArray(wfRaw) ? wfRaw[0] : wfRaw;
    const coachRaw = row.coaches as CoachJoin | CoachJoin[] | undefined;
    const coach = Array.isArray(coachRaw) ? coachRaw[0] : coachRaw ?? null;
    const desc =
      typeof row.description === "string" ? row.description.trim() : null;
    const moaiNameRaw =
      typeof row.name === "string" ? row.name.trim() : "";
    const moaiName =
      moaiNameRaw.length > 0
        ? moaiNameRaw
        : wf?.name?.trim() || null;

    items.push({
      id: `focus:${row.id as string}`,
      kind: "focus",
      memberCount: focusMembersByMoai.get(row.id as string) || 0,
      maxMembers:
        row.max_members != null ? Number(row.max_members) : 10,
      theme: wf?.name?.trim() || null,
      moaiName,
      withCoach: null,
      description: desc && desc.length > 0 ? desc : null,
      coachName: coachPublicLabel(coachRaw as CoachJoin | CoachJoin[] | undefined),
      coachImageUrl: coach?.profile_image_url?.trim() || null,
      memberAvatars: [],
    });
  }

  for (const c of circles) {
    const memberCount = circleMembersById.get(c.id) || 0;
    if (memberCount < 3) continue;

    const circleName =
      typeof c.name === "string" && c.name.trim().length > 0
        ? c.name.trim()
        : null;
    items.push({
      id: `social:${c.id}`,
      kind: "social",
      memberCount,
      maxMembers: 10,
      theme: null,
      moaiName: circleName,
      withCoach: coachMoaiIds.has(c.id),
      description: null,
      coachName: null,
      coachImageUrl: null,
      memberAvatars: avatarsByCircle.get(c.id) ?? [],
      moaiCompletedWorkouts:
        completedWorkoutsByCircle.get(c.id) ?? 0,
    });
  }

  shuffleInPlace(items);

  return NextResponse.json(
    {
      success: true,
      items,
      unavailable: false,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
