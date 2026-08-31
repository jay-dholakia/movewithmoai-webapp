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
      .order("plan_name", { ascending: true });

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const visible = (data || []).filter((p) =>
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
    const paged = visible.slice(from, from + pageSize);

    return NextResponse.json({
      success: true,
      programs: paged,
      total,
      page,
      page_size: pageSize,
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
      plan_id,
      plan_name,
      gender = "All",
      min_age = 0,
      max_age = 120,
      days_per_week = 5,
      description = null,
      difficulty_level = null,
      equipment_required = [],
      base_plan_id = null,
      month_active = null,
      is_paid = false,
      status = "draft",
      assign_type = null, // "focus_moai" | "user" | null
      assign_to_id = null,
    } = body;

    if (!plan_id || typeof plan_id !== "string" || !plan_id.trim()) {
      return NextResponse.json(
        { success: false, error: "plan_id is required (string)" },
        { status: 400 },
      );
    }
    if (!plan_name || typeof plan_name !== "string" || !plan_name.trim()) {
      return NextResponse.json(
        { success: false, error: "plan_name is required" },
        { status: 400 },
      );
    }

    const minAge = Number(min_age);
    const maxAge = Number(max_age);
    const daysPerWeek = Number(days_per_week);
    if ([minAge, maxAge, daysPerWeek].some(Number.isNaN)) {
      return NextResponse.json(
        {
          success: false,
          error: "min_age, max_age and days_per_week must be numbers",
        },
        { status: 400 },
      );
    }
    if (!["All", "M", "F"].includes(gender)) {
      return NextResponse.json(
        { success: false, error: "invalid gender" },
        { status: 400 },
      );
    }
    if (
      difficulty_level !== null &&
      !["Beginner", "Intermediate", "Advanced"].includes(difficulty_level)
    ) {
      return NextResponse.json(
        { success: false, error: "invalid difficulty_level" },
        { status: 400 },
      );
    }

    // Coach-only rule: coaches MUST assign the program to a focus moai or user
    // in their scope. They can't create general/unassigned programs.
    // NOTE: this only records *intent* — the actual linking of workout_focus
    // and users.current_plan happens later, only once the program is
    // published (see the PATCH /[planId] route). A freshly created program
    // may still be missing workouts and shouldn't be pushed to members yet.
    if (!assign_type || !assign_to_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Coaches must assign the program to a focus moai or a user in their scope.",
        },
        { status: 400 },
      );
    }
    if (assign_type === "focus_moai") {
      if (!scope.focusMoaiIds.includes(assign_to_id)) {
        return NextResponse.json(
          {
            success: false,
            error: "You are not assigned to that focus moai.",
          },
          { status: 403 },
        );
      }
    } else if (assign_type === "user") {
      if (!scope.allAssignableUserIds.includes(assign_to_id)) {
        return NextResponse.json(
          {
            success: false,
            error: "That user is not in your coaching scope.",
          },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "invalid assign_type" },
        { status: 400 },
      );
    }

    // Coach programs can only be created as drafts — publishing (and the
    // resulting assignment) happens as a separate, explicit action once the
    // program actually has its workouts.
    if (status === "published") {
      return NextResponse.json(
        {
          success: false,
          error:
            "New programs must be created as drafts; publish separately once workouts are added.",
        },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workout_programs")
      .insert({
        plan_id: plan_id.trim(),
        plan_name: plan_name.trim(),
        gender,
        min_age: minAge,
        max_age: maxAge,
        days_per_week: daysPerWeek,
        description,
        difficulty_level,
        equipment_required: Array.isArray(equipment_required)
          ? equipment_required
          : [],
        base_plan_id,
        month_active,
        is_paid: true,
        is_deprecated: false,
        status: "draft",
        assigned_focus_moai_id:
          assign_type === "focus_moai" ? assign_to_id : null,
        assigned_user_id: assign_type === "user" ? assign_to_id : null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "A program with this plan_id already exists.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    // No assignment side effects here — they run only on publish
    // (see PATCH /[planId] which calls applyProgramAssignment).

    return NextResponse.json({ success: true, program: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
