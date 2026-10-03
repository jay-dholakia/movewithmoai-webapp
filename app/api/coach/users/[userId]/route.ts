import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    // Access check: the user must be inside this coach's scope
    const scope = await getCoachScope(auth.coachId, auth.userId);
    if (!scope.allAssignableUserIds.includes(userId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();

    // User profile (only fields a coach needs)
    const { data: user, error: userErr } = await admin
      .from("users")
      .select(
        "id, email, username, first_name, last_name, display_name, profile_picture_url, city, country, created_at, current_plan, focus, fitness_goal",
      )
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Focus moai membership (limited to this coach's focus moais)
    let focusMoai: {
      id: string;
      name: string;
      joined_at: string | null;
    } | null = null;
    let moaiFocusId: string | null = null;

    if (scope.focusMoaiIds.length > 0) {
      const { data: membership } = await admin
        .from("focus_moai_members")
        .select("focus_moai_id, joined_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .in("focus_moai_id", scope.focusMoaiIds)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const { data: moai } = await admin
          .from("focus_moais")
          .select("id, name, workout_focus_id")
          .eq("id", membership.focus_moai_id)
          .maybeSingle();

        if (moai) {
          focusMoai = {
            id: moai.id,
            name: moai.name,
            joined_at: membership.joined_at ?? null,
          };
          moaiFocusId = moai.workout_focus_id ?? null;
        }
      }
    }

    // Current program. Returned as { id, name } so the page doesn't care about plan_name.
    let program: { id: string; name: string } | null = null;
    if (user.current_plan) {
      const { data } = await admin
        .from("workout_programs")
        .select("id, plan_name")
        .eq("id", user.current_plan)
        .maybeSingle();
      if (data) program = { id: data.id, name: data.plan_name };
    }

    // Focus: the user's own focus, falling back to the focus moai's focus
    const focusId = user.focus || moaiFocusId;
    let focus: { id: string; name: string } | null = null;
    if (focusId) {
      const { data } = await admin
        .from("workout_focus")
        .select("id, name")
        .eq("id", focusId)
        .maybeSingle();
      focus = data ?? null;
    }

    // Commitments + movement goals
    const { data: commitments } = await admin
      .from("weekly_commitments")
      .select(
        "id, week_start, commitment_count, completed_sessions, steps_goal, exercise_minutes_goal",
      )
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(52);

    const commitmentHistory = (commitments || []).map((c) => ({
      ...c,
      completion_rate:
        c.commitment_count > 0
          ? ((c.completed_sessions || 0) / c.commitment_count) * 100
          : 0,
    }));

    // Workout history (view; access already enforced above)
    const { data: workouts } = await admin
      .from("coach_client_workout_history")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(50);

    const { count: totalWorkouts } = await admin
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    return NextResponse.json({
      success: true,
      user: { ...user, total_workouts: totalWorkouts || 0 },
      focusMoai,
      program,
      focus,
      commitmentHistory,
      workoutHistory: workouts || [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[coach/users/:userId] Error:", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
