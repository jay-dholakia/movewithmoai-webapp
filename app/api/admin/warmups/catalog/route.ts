import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import { getWarmupCatalog } from "@/lib/server/workout-warmup";

/** All active stretches + the default warmup routines (one per workout focus). */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const res = await getWarmupCatalog(getSupabaseAdmin());
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true, catalog: res.data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
