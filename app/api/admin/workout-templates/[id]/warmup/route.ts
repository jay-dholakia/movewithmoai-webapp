import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import {
  getResolvedWarmup,
  resetWarmupOverrides,
} from "@/lib/server/workout-warmup";

type Ctx = { params: Promise<{ id: string }> };

/** Resolved warmup: default routine for the workout's focus + this workout's overrides. */
export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const res = await getResolvedWarmup(getSupabaseAdmin(), id);
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true, warmup: res.data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** Resets every slot of this workout's warmup to the default routine. */
export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const res = await resetWarmupOverrides(getSupabaseAdmin(), id);
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true, warmup: res.data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
