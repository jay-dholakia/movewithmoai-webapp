import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const scope = await getCoachScope(auth.coachId, auth.userId);
    if (scope.focusMoaiIds.length === 0) {
      return NextResponse.json({ success: true, focus_moais: [] });
    }

    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("focus_moais")
      .select("id, name, status")
      .in("id", scope.focusMoaiIds);

    return NextResponse.json({ success: true, focus_moais: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
