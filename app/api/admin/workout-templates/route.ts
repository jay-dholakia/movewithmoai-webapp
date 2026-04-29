import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { isEquipmentAdaptedWorkoutTitle } from "@/lib/workout-admin-filters";

const VALID_TYPES = new Set(["upper", "lower", "full", "bodyweight"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("plan_id");
    const unassignedOnly = searchParams.get("unassigned_only") === "true";
    const includeEquipmentAdapted =
      searchParams.get("include_equipment_adapted") === "true";

    const admin = getSupabaseAdmin();
    let q = admin
      .from("workoutss")
      .select(
        "id, title, type, plan_id, order_index, description, is_circuit, estimated_duration_minutes, created_at",
      )
      .order("order_index", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true });

    if (unassignedOnly) {
      q = q.is("plan_id", null);
    } else if (planId) {
      q = q.eq("plan_id", planId);
    } else {
      q = q.limit(500);
    }

    const { data, error } = await q;

    if (error) {
      console.error("[workout-templates GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    let list = data ?? [];
    if (!includeEquipmentAdapted) {
      list = list.filter(
        (w: { title?: string | null }) =>
          !isEquipmentAdaptedWorkoutTitle(w.title ?? null),
      );
    }

    return NextResponse.json({ success: true, workouts: list });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      title,
      type,
      plan_id = null,
      order_index = null,
      description = null,
      is_circuit = false,
      difficulty_level = null,
      estimated_duration_minutes = null,
      tags = null,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 },
      );
    }
    if (!type || typeof type !== "string" || !VALID_TYPES.has(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "type must be upper, lower, full, or bodyweight",
        },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    if (plan_id !== null && plan_id !== undefined && plan_id !== "") {
      const { data: prog } = await admin
        .from("workout_programs")
        .select("plan_id")
        .eq("plan_id", String(plan_id).trim())
        .maybeSingle();
      if (!prog) {
        return NextResponse.json(
          { success: false, error: "Invalid plan_id: program not found" },
          { status: 400 },
        );
      }
    }
    const insert: Record<string, unknown> = {
      title: title.trim(),
      type,
      description,
      is_circuit: Boolean(is_circuit),
    };

    if (plan_id && String(plan_id).trim()) {
      insert.plan_id = String(plan_id).trim();
    } else {
      insert.plan_id = null;
    }

    if (order_index !== null && order_index !== undefined) {
      insert.order_index = Number(order_index);
    }

    if (difficulty_level) insert.difficulty_level = difficulty_level;
    if (estimated_duration_minutes != null) {
      insert.estimated_duration_minutes = Number(estimated_duration_minutes);
    }
    if (tags && Array.isArray(tags)) insert.tags = tags;

    const { data, error } = await admin
      .from("workoutss")
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[workout-templates POST]", error);
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
