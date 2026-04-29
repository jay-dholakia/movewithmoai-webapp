import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id: workoutId } = await context.params;
    const body = await request.json();
    const row_ids = body.row_ids as string[] | undefined;

    if (!Array.isArray(row_ids) || row_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "row_ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: rows, error: fetchErr } = await admin
      .from("workout_exercises")
      .select("id, workout_template_id")
      .in("id", row_ids);

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: fetchErr.message },
        { status: 400 },
      );
    }

    const found = rows ?? [];
    if (found.length !== row_ids.length) {
      return NextResponse.json(
        { success: false, error: "One or more exercise row IDs not found" },
        { status: 400 },
      );
    }

    for (const r of found) {
      if (r.workout_template_id !== workoutId) {
        return NextResponse.json(
          {
            success: false,
            error: "All rows must belong to this workout template",
          },
          { status: 400 },
        );
      }
    }

    for (let i = 0; i < row_ids.length; i++) {
      const { error: upErr } = await admin
        .from("workout_exercises")
        .update({ order_index: i })
        .eq("id", row_ids[i])
        .eq("workout_template_id", workoutId);
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
