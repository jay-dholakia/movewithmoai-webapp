import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";
import { checkCoachWarmupAccess } from "@/lib/server/coach-warmup-access";
import {
  resetWarmupOverrides,
  upsertWarmupOverride,
} from "@/lib/server/workout-warmup";

type Ctx = { params: Promise<{ id: string; sequence: string }> };

/** Replaces one warmup stretch for this workout only. */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { id, sequence } = await context.params;
    const denied = await checkCoachWarmupAccess(id, scope, "write");
    if (denied) return denied;

    const body = await request.json();
    const res = await upsertWarmupOverride(getSupabaseAdmin(), {
      workoutId: id,
      sequence: Number(sequence),
      body,
      userId: auth.userId,
    });
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

/** Resets one warmup slot to the default routine's stretch. */
export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const { id, sequence } = await context.params;
    const denied = await checkCoachWarmupAccess(id, scope, "write");
    if (denied) return denied;

    const seq = Number(sequence);
    if (!Number.isInteger(seq) || seq < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid sequence" },
        { status: 400 },
      );
    }
    const res = await resetWarmupOverrides(getSupabaseAdmin(), id, seq);
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
