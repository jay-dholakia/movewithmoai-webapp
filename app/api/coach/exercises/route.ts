import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyCoachRequest } from "@/lib/server/coach-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      name,
      category = null,
      muscle_group = null,
      log_type = null,
      instructions = null,
      equipment = null,
      form_video_url = null,
      progressive_overload = null,
    } = body as {
      name?: string;
      category?: string | null;
      muscle_group?: string | null;
      log_type?: string | null;
      instructions?: string | null;
      equipment?: string[] | null;
      form_video_url?: string | null;
      progressive_overload?: boolean | null;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 },
      );
    }

    if (
      log_type !== null &&
      log_type !== undefined &&
      !["weight_reps", "reps", "duration", "distance"].includes(log_type)
    ) {
      return NextResponse.json(
        { success: false, error: "invalid log_type" },
        { status: 400 },
      );
    }

    if (equipment !== null && !Array.isArray(equipment)) {
      return NextResponse.json(
        { success: false, error: "equipment must be an array of strings" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("exercises")
      .insert({
        name: name.trim(),
        category,
        muscle_group,
        log_type,
        instructions,
        equipment: equipment ?? null,
        form_video_url,
        progressive_overload: Boolean(progressive_overload),
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, exercise: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
