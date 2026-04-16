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
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(
      Number(searchParams.get("limit") || "80") || 80,
      200,
    );

    const admin = getSupabaseAdmin();
    let query = admin
      .from("exercises")
      .select(
        "id, name, category, muscle_group, equipment, form_video_url, log_type, instructions",
      )
      .order("name", { ascending: true })
      .limit(limit);

    if (q.length > 0) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, exercises: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
