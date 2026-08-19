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
    const search = searchParams.get("search")?.trim() ?? "";
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    // ── Source 1: Active focus moai members ──
    const { data: fmMembers } = await admin
      .from("focus_moai_members")
      .select("user_id")
      .eq("status", "active");

    const focusUserIds = (fmMembers || []).map((r) => r.user_id as string);

    // ── Source 2: Circle members in circles with an active coach subscription ──
    const { data: activeSubs } = await admin
      .from("moai_coach_subscriptions")
      .select("moai_id")
      .eq("status", "active");

    const coachCircleIds = (activeSubs || []).map((r) => r.moai_id as string);

    let coachUserIds: string[] = [];
    if (coachCircleIds.length > 0) {
      const { data: cMembers } = await admin
        .from("circle_members")
        .select("user_id")
        .in("circle_id", coachCircleIds)
        .eq("status", "active");

      coachUserIds = (cMembers || []).map((r) => r.user_id as string);
    }

    // ── Combine & deduplicate ──
    const paidUserIds = [...new Set([...focusUserIds, ...coachUserIds])];

    if (paidUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        total: 0,
        page,
        page_size: pageSize,
      });
    }

    // ── Fetch user details with pagination + search ──
    let q = admin
      .from("users")
      .select(
        "id, display_name, first_name, last_name, email, focus, current_plan",
        { count: "exact" },
      )
      .in("id", paidUserIds)
      .order("first_name", { ascending: true })
      .range(from, to);

    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,display_name.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await q;

    if (error) {
      console.error("[paid-users GET]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      users: data ?? [],
      total: count ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
