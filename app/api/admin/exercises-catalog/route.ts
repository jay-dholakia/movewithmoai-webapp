import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const equipment = (searchParams.get("equipment") || "").trim();
    const muscle = (searchParams.get("muscle") || "").trim();

    const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
    const pageSize = Math.min(
      Number(searchParams.get("pageSize") || "20") || 20,
      200,
    );
    const offset = (page - 1) * pageSize;

    const admin = getSupabaseAdmin();
    let query = admin
      .from("exercises")
      .select(
        "id, name, category, muscle_group, equipment, form_video_url, log_type, instructions, progressive_overload",
        { count: "exact" },
      )
      .order("name", { ascending: true });

    if (q.length > 0) {
      query = query.ilike("name", `%${q}%`);
    }

    if (equipment.length > 0) {
      query = query.contains("equipment", [equipment]);
    }

    if (muscle.length > 0) {
      query = query.ilike("muscle_group", muscle);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      exercises: data ?? [],
      total: count ?? 0,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
