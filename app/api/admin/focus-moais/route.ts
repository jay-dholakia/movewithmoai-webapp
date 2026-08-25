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
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = getSupabaseAdmin();

    const { data, error, count } = await admin
      .from("focus_moais")
      .select("id, name, status, max_members, coach_id, workout_focus_id", {
        count: "exact",
      })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[focus-moais GET]", error);
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
