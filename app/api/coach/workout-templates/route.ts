import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope, coachCanSeeProgram } from "@/lib/server/coach-scope";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { searchParams } = new URL(request.url);

    // Filters
    // - plan_id: workouts CURRENTLY in this program.
    // - pickable_for_plan: workouts a coach could ADD to this program
    //   (their own unassigned + workouts in programs they can see,
    //    excluding ones already in this plan). Meant for the picker drawer.
    // - unassigned_only: only workouts with plan_id = null.
    // - mine_only: only workouts the coach personally created.
    const planId = searchParams.get("plan_id");
    const pickableForPlan = searchParams.get("pickable_for_plan");
    const unassignedOnly = searchParams.get("unassigned_only") === "true";
    const mineOnly = searchParams.get("mine_only") === "true";
    const includeAdapted =
      searchParams.get("include_equipment_adapted") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );
    const q = (searchParams.get("q") || "").trim();

    const admin = getSupabaseAdmin();

    // If asking for a program (either mode), confirm the coach can see it.
    const gatingPlanId = planId ?? pickableForPlan;
    if (gatingPlanId) {
      const { data: program } = await admin
        .from("workout_programs")
        .select("plan_id, created_by, assigned_focus_moai_id, assigned_user_id")
        .eq("plan_id", gatingPlanId)
        .single();
      if (!program) {
        return NextResponse.json(
          { success: false, error: "Program not found" },
          { status: 404 },
        );
      }
      if (
        !coachCanSeeProgram(scope, {
          created_by:
            (program as { created_by?: string | null }).created_by ?? null,
          assigned_focus_moai_id:
            (program as { assigned_focus_moai_id?: string | null })
              .assigned_focus_moai_id ?? null,
          assigned_user_id:
            (program as { assigned_user_id?: string | null })
              .assigned_user_id ?? null,
        })
      ) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    let query = admin
      .from("workoutss")
      .select("*", { count: "exact" })
      // Show newest first so a freshly-created workout is visible on page 1.
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("title", { ascending: true });

    if (planId) {
      // Strict "workouts in this plan".
      query = query.eq("plan_id", planId);
    } else if (pickableForPlan) {
      // Picker view: everything that could be added to this plan, from any
      // source. Excludes workouts already assigned to this specific plan so
      // the coach doesn't see duplicates when picking. Assumes workouts in
      // other programs are still valid picks (they'll be re-parented on
      // insert). If you'd rather restrict to unassigned only, uncomment the
      // .is("plan_id", null) line and drop the neq.
      query = query.neq("plan_id", pickableForPlan);
      // query = query.is("plan_id", null);
    } else if (unassignedOnly) {
      query = query.is("plan_id", null);
    }

    if (mineOnly) {
      query = query.eq("created_by", scope.userId);
    }

    if (!includeAdapted) {
      query = query.not("title", "ilike", "%adapted to your equipment%");
    }
    if (q) query = query.ilike("title", `%${q}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const workouts = (data || []).map((w) => {
      const cb = (w as { created_by?: string | null }).created_by ?? null;
      return {
        ...w,
        can_edit: cb === scope.userId,
        is_mine: cb === scope.userId,
      };
    });

    const total = count ?? workouts.length;
    return NextResponse.json({
      success: true,
      workouts,
      count: total,
      pagination: {
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const body = await request.json();
    const {
      title,
      type,
      plan_id = null,
      description = null,
      order_index = null,
      is_circuit = false,
      difficulty_level = null,
      estimated_duration_minutes = null,
      tags = null,
    } = body as {
      title?: string;
      type?: string;
      plan_id?: string | null;
      description?: string | null;
      order_index?: number | null;
      is_circuit?: boolean;
      difficulty_level?: string | null;
      estimated_duration_minutes?: number | null;
      tags?: string[] | null;
    };

    if (!title?.trim() || !type?.trim()) {
      return NextResponse.json(
        { success: false, error: "title and type are required" },
        { status: 400 },
      );
    }
    if (!["upper", "lower", "full", "bodyweight"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "invalid type" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    if (plan_id) {
      const { data: program } = await admin
        .from("workout_programs")
        .select("plan_id, created_by")
        .eq("plan_id", plan_id)
        .single();
      if (!program) {
        return NextResponse.json(
          { success: false, error: "Program not found" },
          { status: 404 },
        );
      }
      if (
        (program as { created_by?: string | null }).created_by !== scope.userId
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "You can only add workouts to programs you created.",
          },
          { status: 403 },
        );
      }
    }

    const { data, error } = await admin
      .from("workoutss")
      .insert({
        title: title.trim(),
        type,
        plan_id,
        description,
        order_index,
        is_circuit,
        difficulty_level,
        estimated_duration_minutes,
        tags,
        is_public: false,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, workout: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
