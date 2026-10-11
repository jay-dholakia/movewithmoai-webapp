import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moaiId: string }> },
) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const scope = await getCoachScope(auth.coachId, auth.userId);
    const { moaiId } = await params;

    const admin = getSupabaseAdmin();

    // ── 1. Get focus moai details ──────────────────────────────────────
    const { data: focusMoai, error: moaiErr } = await admin
      .from("focus_moais")
      .select(
        "id, name, description, status, max_members, price_monthly, coach_id, workout_focus_id, stripe_product_id, stripe_price_id, is_public, is_published, created_at",
      )
      .eq("id", moaiId)
      .single();

    if (moaiErr || !focusMoai) {
      return NextResponse.json(
        { success: false, error: "Focus Moai not found" },
        { status: 404 },
      );
    }

    // Verify coach owns this focus moai
    if (focusMoai.coach_id !== auth.coachId) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this Focus Moai" },
        { status: 403 },
      );
    }

    // ── 2. Get members ─────────────────────────────────────────────────
    const { data: members, error: membersErr } = await admin
      .from("focus_moai_members")
      .select("id, user_id, status, joined_at")
      .eq("focus_moai_id", moaiId)
      .eq("status", "active");

    const memberUserIds = (members || []).map((m) => m.user_id);

    // ── 3. Get user profiles for members ───────────────────────────────
    let userProfiles: Record<string, any> = {};
    if (memberUserIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select(
          "id, email, username, first_name, last_name, profile_picture_url, focus, current_plan, city, country",
        )
        .in("id", memberUserIds);

      if (users) {
        users.forEach((u) => {
          userProfiles[u.id] = u;
        });
      }
    }

    // ── 4. Get commitment data for all members ─────────────────────────
    let allCommitments: any[] = [];
    if (memberUserIds.length > 0) {
      const { data: commitments } = await admin
        .from("weekly_commitments")
        .select(
          "id, user_id, week_start, commitment_count, completed_sessions, steps_goal, exercise_minutes_goal",
        )
        .in("user_id", memberUserIds)
        .order("week_start", { ascending: false });

      allCommitments = commitments || [];
    }

    // ── 5. Get workout sessions for all members ────────────────────────
    let allWorkoutSessions: any[] = [];
    if (memberUserIds.length > 0) {
      const { data: sessions } = await admin
        .from("workout_sessions")
        .select("id, user_id, status, started_at, completed_at")
        .in("user_id", memberUserIds);

      allWorkoutSessions = sessions || [];
    }

    // ── 6. Calculate current week start (Monday) ───────────────────────
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    const year = currentWeekStart.getFullYear();
    const month = String(currentWeekStart.getMonth() + 1).padStart(2, "0");
    const day = String(currentWeekStart.getDate()).padStart(2, "0");
    const currentWeekStartStr = `${year}-${month}-${day}`;

    // ── 7. Build per-member metrics ────────────────────────────────────
    const memberMetrics = (members || []).map((member) => {
      const profile = userProfiles[member.user_id] || {};
      const memberCommitments = allCommitments.filter(
        (c) => c.user_id === member.user_id,
      );
      const memberSessions = allWorkoutSessions.filter(
        (s) => s.user_id === member.user_id,
      );

      // Current week commitment
      const currentWeek = memberCommitments.find(
        (c) => c.week_start === currentWeekStartStr,
      );

      const currentWeekCommitment = currentWeek?.commitment_count || 0;
      const currentWeekCompleted = currentWeek?.completed_sessions || 0;
      const currentWeekCompletionRate =
        currentWeekCommitment > 0
          ? (currentWeekCompleted / currentWeekCommitment) * 100
          : 0;

      // Overall stats
      const totalCommitmentWeeks = memberCommitments.filter(
        (c) => c.commitment_count > 0,
      ).length;
      const totalCommitted = memberCommitments.reduce(
        (sum, c) => sum + (c.commitment_count || 0),
        0,
      );
      const totalCompleted = memberCommitments.reduce(
        (sum, c) => sum + (c.completed_sessions || 0),
        0,
      );
      const overallCompletionRate =
        totalCommitted > 0 ? (totalCompleted / totalCommitted) * 100 : 0;

      const totalWorkouts = memberSessions.filter(
        (s) => s.status === "completed",
      ).length;

      return {
        user_id: member.user_id,
        joined_at: member.joined_at,
        email: profile.email || "",
        username: profile.username || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        profile_picture_url: profile.profile_picture_url || null,
        current_week_commitment: currentWeekCommitment,
        current_week_completed: currentWeekCompleted,
        current_week_completion_rate: currentWeekCompletionRate,
        overall_completion_rate: overallCompletionRate,
        total_commitment_weeks: totalCommitmentWeeks,
        total_workouts: totalWorkouts,
      };
    });

    // ── 8. Build group commitment history (by week) ────────────────────
    const weekMap = new Map<
      string,
      {
        total_commitment: number;
        total_completed: number;
        member_count: number;
      }
    >();

    for (const c of allCommitments) {
      const existing = weekMap.get(c.week_start) || {
        total_commitment: 0,
        total_completed: 0,
        member_count: 0,
      };
      existing.total_commitment += c.commitment_count || 0;
      existing.total_completed += c.completed_sessions || 0;
      if (c.commitment_count > 0) existing.member_count += 1;
      weekMap.set(c.week_start, existing);
    }

    const moaiCommitmentHistory = Array.from(weekMap.entries())
      .map(([week_start, data]) => ({
        week_start,
        total_commitment: data.total_commitment,
        total_completed: data.total_completed,
        member_count: data.member_count,
        completion_rate:
          data.total_commitment > 0
            ? (data.total_completed / data.total_commitment) * 100
            : 0,
      }))
      .sort(
        (a, b) =>
          new Date(b.week_start).getTime() - new Date(a.week_start).getTime(),
      );

    // ── 9. Build group workout stats ───────────────────────────────────
    const totalWorkouts = allWorkoutSessions.length;
    const completedWorkouts = allWorkoutSessions.filter(
      (s) => s.status === "completed",
    ).length;

    // ── 10. Calculate weeks active ─────────────────────────────────────
    const createdAt = new Date(focusMoai.created_at);
    const weeksActive = Math.max(
      1,
      Math.ceil(
        (now.getTime() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
      ),
    );

    // ── 11. Get workout focus name ─────────────────────────────────────
    let workoutFocusName: string | null = null;
    if (focusMoai.workout_focus_id) {
      const { data: wf } = await admin
        .from("workout_focus")
        .select("name")
        .eq("id", focusMoai.workout_focus_id)
        .single();
      workoutFocusName = wf?.name || null;
    }

    return NextResponse.json({
      success: true,
      focusMoai: {
        id: focusMoai.id,
        name: focusMoai.name,
        description: focusMoai.description,
        status: focusMoai.status,
        max_members: focusMoai.max_members,
        price_monthly: focusMoai.price_monthly,
        workout_focus_id: focusMoai.workout_focus_id,
        workout_focus_name: workoutFocusName,
        is_public: focusMoai.is_public,
        is_published: focusMoai.is_published,
        created_at: focusMoai.created_at,
        member_count: memberUserIds.length,
        weeks_active: weeksActive,
        members: memberMetrics,
        moai_commitment_history: moaiCommitmentHistory,
        moai_workout_stats: {
          total_workouts: totalWorkouts,
          completed_workouts: completedWorkouts,
        },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("Focus Moai detail error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}