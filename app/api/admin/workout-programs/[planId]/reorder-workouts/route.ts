import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { planId } = await context.params;
    const decoded = decodeURIComponent(planId);
    const body = await request.json();
    const workout_ids = body.workout_ids as string[] | undefined;

    if (!Array.isArray(workout_ids) || workout_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "workout_ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: rows, error: fetchErr } = await admin
      .from("workoutss")
      .select("id, plan_id")
      .in("id", workout_ids);

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: fetchErr.message },
        { status: 400 },
      );
    }

    const found = rows ?? [];
    if (found.length !== workout_ids.length) {
      return NextResponse.json(
        { success: false, error: "One or more workout IDs not found" },
        { status: 400 },
      );
    }

    for (const r of found) {
      if (r.plan_id !== decoded) {
        return NextResponse.json(
          {
            success: false,
            error: "All workouts must belong to this program",
          },
          { status: 400 },
        );
      }
    }

    for (let i = 0; i < workout_ids.length; i++) {
      const { error: upErr } = await admin
        .from("workoutss")
        .update({ order_index: i })
        .eq("id", workout_ids[i])
        .eq("plan_id", decoded);
      if (upErr) {
        return NextResponse.json(
          { success: false, error: upErr.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
