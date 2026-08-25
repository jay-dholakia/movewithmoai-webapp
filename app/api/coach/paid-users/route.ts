import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    // Adjust these two lines if your verifyCoachRequest returns a different shape.
    // We need the row id from the `coaches` table (not the user id) because
    // focus_moais.coach_id and moai_coach_subscriptions.coach_id both reference it.
    const coachId: string | undefined =
      (auth as { coach?: { id?: string } }).coach?.id ??
      (auth as { coachId?: string }).coachId;

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
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    // ── Source 1: Active members of THIS coach's focus moais ──
    // focus_moais.coach_id → coaches.id
    const { data: coachFocusMoais, error: fmErr } = await admin
      .from("focus_moais")
      .select("id")
      .eq("coach_id", coachId)
      .eq("status", "active");

    if (fmErr) {
      console.error("[coach paid-users] focus_moais", fmErr);
      return NextResponse.json(
        { success: false, error: fmErr.message },
        { status: 500 },
      );
    }

    const focusMoaiIds = (coachFocusMoais || []).map((r) => r.id as string);

    let focusUserIds: string[] = [];
    if (focusMoaiIds.length > 0) {
      const { data: fmMembers, error: fmMembersErr } = await admin
        .from("focus_moai_members")
        .select("user_id")
        .in("focus_moai_id", focusMoaiIds)
        .eq("status", "active");

      if (fmMembersErr) {
        console.error("[coach paid-users] focus_moai_members", fmMembersErr);
        return NextResponse.json(
          { success: false, error: fmMembersErr.message },
          { status: 500 },
        );
      }

      focusUserIds = (fmMembers || []).map((r) => r.user_id as string);
    }

    const { data: activeSubs, error: subsErr } = await admin
      .from("moai_coach_subscriptions")
      .select("moai_id")
      .eq("coach_id", coachId)
      .eq("status", "active");

    if (subsErr) {
      console.error("[coach paid-users] moai_coach_subscriptions", subsErr);
      return NextResponse.json(
        { success: false, error: subsErr.message },
        { status: 500 },
      );
    }

    const coachCircleIds = [
      ...new Set((activeSubs || []).map((r) => r.moai_id as string)),
    ];

    let coachUserIds: string[] = [];
    if (coachCircleIds.length > 0) {
      const { data: cMembers, error: cMembersErr } = await admin
        .from("circle_members")
        .select("user_id")
        .in("circle_id", coachCircleIds)
        .eq("status", "active");

      if (cMembersErr) {
        console.error("[coach paid-users] circle_members", cMembersErr);
        return NextResponse.json(
          { success: false, error: cMembersErr.message },
          { status: 500 },
        );
      }

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
      console.error("[coach paid-users GET]", error);
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
