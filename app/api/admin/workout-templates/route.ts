import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { isEquipmentAdaptedWorkoutTitle } from "@/lib/workout-admin-filters";

const VALID_TYPES = new Set(["upper", "lower", "full", "bodyweight"]);

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_SCAN = 2000;

const SELECT_COLS =
  "id, title, type, plan_id, order_index, description, is_circuit, estimated_duration_minutes, created_at";

function toInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function paginated(
  workouts: unknown[],
  total: number,
  page: number,
  pageSize: number,
) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    success: true,
    workouts,
    count: total,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      has_more: page < totalPages,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("plan_id");
    const unassignedOnly = searchParams.get("unassigned_only") === "true";
    const includeEquipmentAdapted =
      searchParams.get("include_equipment_adapted") === "true";
    const search = (searchParams.get("q") ?? "").trim();

    const page = Math.max(toInt(searchParams.get("page"), 1), 1);
    const pageSize = Math.min(
      Math.max(toInt(searchParams.get("page_size"), DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const offset = (page - 1) * pageSize;

    const admin = getSupabaseAdmin();
    let q = admin
      .from("workoutss")
      .select(SELECT_COLS, { count: "exact" })
      .eq("is_public", true)
      .order("order_index", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .order("id", { ascending: true }); // stable tiebreaker

    if (unassignedOnly) {
      q = q.is("plan_id", null);
    } else if (planId) {
      q = q.eq("plan_id", planId);
    }

    if (search) {
      // strip PostgREST filter metacharacters before interpolating
      const safe = search.replace(/[%,().*]/g, " ").trim();
      if (safe) q = q.or(`title.ilike.%${safe}%,type.ilike.%${safe}%`);
    }

    // When the equipment-adapted post-filter is off, we can paginate in SQL and
    // trust the exact count. When it's on, rows get dropped in JS afterwards, so
    // we scan a bounded set, filter, then slice — otherwise count/pages would lie.
    if (includeEquipmentAdapted) {
      const { data, error, count } = await q.range(
        offset,
        offset + pageSize - 1,
      );
      if (error) {
        console.error("[workout-templates GET]", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json(
        paginated(data ?? [], count ?? 0, page, pageSize),
      );
    }

    const { data, error } = await q.range(0, MAX_SCAN - 1);
    if (error) {
      console.error("[workout-templates GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const filtered = (data ?? []).filter(
      (w: { title?: string | null }) =>
        !isEquipmentAdaptedWorkoutTitle(w.title ?? null),
    );

    return NextResponse.json(
      paginated(
        filtered.slice(offset, offset + pageSize),
        filtered.length,
        page,
        pageSize,
      ),
    );
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
      is_public: true,
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
