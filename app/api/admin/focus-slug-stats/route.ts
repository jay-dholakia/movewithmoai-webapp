import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const admin = getSupabaseAdmin();

    const { data, error } = await admin.rpc("get_focus_moai_slug_stats", {
      p_from: parseDate(searchParams.get("from")),
      p_to: parseDate(searchParams.get("to")),
    });

    if (error) {
      console.error("[focus-slug-stats]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // bigint columns can arrive as strings from PostgREST — normalize to numbers.
    const numericKeys = [
      "link_opens",
      "codes_entered",
      "app_store_clicks",
      "play_store_clicks",
      "join_taps",
      "joins",
      "users_left",
    ] as const;
    const stats = (data ?? []).map((row: Record<string, unknown>) => {
      const out: Record<string, unknown> = { ...row };
      for (const key of numericKeys) out[key] = Number(row[key] ?? 0);
      return out;
    });

    return NextResponse.json({ success: true, stats });
  } catch (e) {
    console.error("[focus-slug-stats]", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
