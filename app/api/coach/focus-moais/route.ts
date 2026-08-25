import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const coachId = auth.coachId;
    if (!coachId) {
      return NextResponse.json(
        { success: false, error: "Coach identity not found on request" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("page_size") ?? 20)),
    );
    const search = searchParams.get("search")?.trim() ?? "";
    // Default to active-only so pickers don't surface archived moais.
    // Pass ?status=all to include everything (or a specific status value).
    const statusFilter = searchParams.get("status") ?? "active";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    let q = admin
      .from("focus_moais")
      .select(
        "id, name, description, status, max_members, price_monthly, workout_focus_id, coach_id, join_slug, created_at, updated_at",
        { count: "exact" },
      )
      .eq("coach_id", coachId)
      .order("name", { ascending: true })
      .range(from, to);

    if (statusFilter && statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }

    if (search) {
      q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await q;

    if (error) {
      console.error("[coach focus-moais GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      focus_moais: data ?? [],
      total: count ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
