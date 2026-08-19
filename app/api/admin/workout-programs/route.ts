import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const includeDeprecated = searchParams.get("include_deprecated") === "true";

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, gender, min_age, max_age, days_per_week, description, difficulty_level, is_deprecated, is_paid, status, month_active, assigned_focus_moai_id, assigned_user_id, created_at",
        { count: "exact" },
      )
      .order("is_deprecated", { ascending: true, nullsFirst: true })
      .order("plan_name", { ascending: true })
      .range(from, to);

    if (!includeDeprecated) {
      q = q.or("is_deprecated.is.null,is_deprecated.eq.false");
    }

    // Visibility: default shows only general (unscoped) programs
    const filterFocusMoaiId = searchParams.get("focus_moai_id");
    const filterUserId = searchParams.get("user_id");
    const showAll = searchParams.get("show_all") === "true";

    if (!showAll) {
      if (filterFocusMoaiId) {
        q = q.or(
          `and(assigned_focus_moai_id.is.null,assigned_user_id.is.null),assigned_focus_moai_id.eq.${filterFocusMoaiId}`,
        );
      } else if (filterUserId) {
        q = q.or(
          `and(assigned_focus_moai_id.is.null,assigned_user_id.is.null),assigned_user_id.eq.${filterUserId}`,
        );
      } else {
        q = q.is("assigned_focus_moai_id", null).is("assigned_user_id", null);
      }
    }

    const { data, error, count } = await q;

    if (error) {
      console.error("[workout-programs GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      programs: data ?? [],
      total: count ?? 0,
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
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const userId = auth.userId;

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
      assign_to_id = null, // UUID of focus_moai or user
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
          assign_type === "focus_moai" && assign_to_id ? assign_to_id : null,
        assigned_user_id:
          assign_type === "user" && assign_to_id ? assign_to_id : null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[workout-programs POST]", error);
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

    // Handle assignment side effects
    if (assign_type && assign_to_id && data?.id) {
      try {
        if (assign_type === "focus_moai") {
          // 1. Link workout_focus → this program
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

          // 2. Assign current_plan to all active members of this focus moai
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
          // Assign current_plan to the individual user
          await admin
            .from("users")
            .update({ current_plan: data.id })
            .eq("id", assign_to_id);
        }
      } catch (assignErr) {
        // Log but don't fail — program was created successfully
        console.warn("[workout-programs POST] assignment failed:", assignErr);
      }
    }

    return NextResponse.json({ success: true, program: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
