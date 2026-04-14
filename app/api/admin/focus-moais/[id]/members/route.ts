import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const focusMoaiId = decodeURIComponent(id);
    if (!focusMoaiId) {
      return NextResponse.json(
        { success: false, error: "Missing focus moai id" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: rows, error } = await admin
      .from("focus_moai_members")
      .select(
        `
        id,
        user_id,
        joined_at,
        status,
        users (
          id,
          first_name,
          last_name,
          username,
          email,
          profile_picture_url
        )
      `,
      )
      .eq("focus_moai_id", focusMoaiId)
      .eq("status", "active")
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("[focus-moai members]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const members = (rows || []).map((row: Record<string, unknown>) => {
      const u = row.users;
      const user = Array.isArray(u) ? u[0] : u;
      return {
        id: row.id,
        user_id: row.user_id,
        joined_at: row.joined_at,
        status: row.status,
        users: user ?? null,
      };
    });

    return NextResponse.json({ success: true, members });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
