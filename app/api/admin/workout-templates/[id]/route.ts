import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

const VALID_TYPES = new Set(["upper", "lower", "full", "bodyweight"]);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("workoutss")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Workout not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, workout: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const admin = getSupabaseAdmin();

    const patch: Record<string, unknown> = {};

    if ("title" in body && body.title != null)
      patch.title = String(body.title).trim();
    if ("type" in body && body.type != null) {
      if (!VALID_TYPES.has(String(body.type))) {
        return NextResponse.json(
          {
            success: false,
            error: "type must be upper, lower, full, or bodyweight",
          },
          { status: 400 },
        );
      }
      patch.type = body.type;
    }
    if ("description" in body) patch.description = body.description;
    if ("is_circuit" in body) patch.is_circuit = Boolean(body.is_circuit);
    if ("difficulty_level" in body) patch.difficulty_level = body.difficulty_level;
    if ("estimated_duration_minutes" in body)
      patch.estimated_duration_minutes =
        body.estimated_duration_minutes == null
          ? null
          : Number(body.estimated_duration_minutes);
    if ("tags" in body && Array.isArray(body.tags)) patch.tags = body.tags;
    if ("order_index" in body)
      patch.order_index =
        body.order_index === null || body.order_index === ""
          ? null
          : Number(body.order_index);

    if ("plan_id" in body) {
      const pid = body.plan_id;
      if (pid === null || pid === "") {
        patch.plan_id = null;
      } else {
        const { data: prog } = await admin
          .from("workout_programs")
          .select("plan_id")
          .eq("plan_id", String(pid).trim())
          .maybeSingle();
        if (!prog) {
          return NextResponse.json(
            { success: false, error: "Invalid plan_id" },
            { status: 400 },
          );
        }
        patch.plan_id = String(pid).trim();
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("workoutss")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, workout: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { error: delEx } = await admin
      .from("workout_exercises")
      .delete()
      .eq("workout_template_id", id);
    if (delEx) {
      return NextResponse.json(
        { success: false, error: delEx.message },
        { status: 400 },
      );
    }

    const { error } = await admin.from("workoutss").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
