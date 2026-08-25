import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );
    const search = searchParams.get("q")?.trim() ?? "";
    const onlySelected = searchParams.get("only_selected") === "true";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    let q = admin
      .from("workout_programs")
      .select(
        "id, plan_id, plan_name, difficulty_level, description, status, is_free_library, created_at",
        { count: "exact" },
      )
      .eq("is_paid", false)
      .or("is_deprecated.is.null,is_deprecated.eq.false")
      .order("is_free_library", { ascending: false })
      .order("plan_name", { ascending: true })
      .range(from, to);

    if (search) {
      const safe = search.replace(/[%,().*]/g, " ").trim();
      if (safe) q = q.ilike("plan_name", `%${safe}%`);
    }

    if (onlySelected) {
      q = q.eq("is_free_library", true);
    }

    const { data, error, count } = await q;

    if (error) {
      console.error("[free-library GET]", error);
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
