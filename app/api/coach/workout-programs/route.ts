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

    // Pull enough to filter — we do coach-visibility filtering in memory so the
    // combination of "own OR general OR scoped-to-my-things" stays one query.
    // If your programs count grows very large, move this to a SQL OR clause.
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
        is_paid: Boolean(is_paid),
        is_deprecated: false,
        status: status === "published" ? "published" : "draft",
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

    // Assignment side effects — same behavior as the admin create route
    if (data?.id) {
      try {
        if (assign_type === "focus_moai") {
          const { data: fm } = await admin
            .from("focus_moais")
            .select("workout_focus_id")
            .eq("id", assign_to_id)
            .single();

          if (fm?.workout_focus_id) {
            await admin
              .from("workout_focus")
              .update({ workout_program_id: data.id })
              .eq("id", fm.workout_focus_id);
          }

          const { data: members } = await admin
            .from("focus_moai_members")
            .select("user_id")
            .eq("focus_moai_id", assign_to_id)
            .eq("status", "active");
          const memberIds = (members || []).map((m) => m.user_id as string);
          if (memberIds.length > 0) {
            await admin
              .from("users")
              .update({ current_plan: data.id })
              .in("id", memberIds);
          }
        } else if (assign_type === "user") {
          await admin
            .from("users")
            .update({ current_plan: data.id })
            .eq("id", assign_to_id);
        }
      } catch (assignErr) {
        console.warn(
          "[coach workout-programs POST] assignment side-effect failed:",
          assignErr,
        );
      }
    }

    return NextResponse.json({ success: true, program: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
