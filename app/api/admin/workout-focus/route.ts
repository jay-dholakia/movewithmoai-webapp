import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export type WorkoutFocusAdminRow = {
  id: string;
  name: string;
  plan_id: string | null;
  focus_moai_count: number;
};

async function loadFocusRows(admin: ReturnType<typeof getSupabaseAdmin>) {
  const fq = await admin.from("workout_focus").select("id, name, plan_id");
  if (fq.error) {
    const fb = await admin.from("workout_focus").select("id, name");
    if (fb.error) throw new Error(fb.error.message);
    return ((fb.data || []) as { id: string; name: string }[]).map((r) => ({
      ...r,
      plan_id: null as string | null,
    }));
  }
  return (fq.data || []) as { id: string; name: string; plan_id: string | null }[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const admin = getSupabaseAdmin();
    const rows = await loadFocusRows(admin);

    const { data: fmRows, error: fmError } = await admin
      .from("focus_moais")
      .select("workout_focus_id");
    if (fmError) {
      console.warn("[workout-focus GET] focus_moais:", fmError);
    }

    const countByFocus = new Map<string, number>();
    for (const row of fmRows || []) {
      const id = row.workout_focus_id as string | null;
      if (!id) continue;
      countByFocus.set(id, (countByFocus.get(id) || 0) + 1);
    }

    const focuses: WorkoutFocusAdminRow[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      plan_id: r.plan_id ?? null,
      focus_moai_count: countByFocus.get(r.id) || 0,
    }));

    focuses.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

    return NextResponse.json({ success: true, focuses });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[workout-focus GET]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 },
      );
    }

    let plan_id: string | null = null;
    if (body.plan_id != null && body.plan_id !== "") {
      if (typeof body.plan_id !== "string") {
        return NextResponse.json(
          { success: false, error: "plan_id must be a string or null" },
          { status: 400 },
        );
      }
      plan_id = body.plan_id.trim() || null;
    }

    const admin = getSupabaseAdmin();
    const insertPayload: Record<string, unknown> = { name };
    if (plan_id) insertPayload.plan_id = plan_id;

    const { data, error } = await admin
      .from("workout_focus")
      .insert(insertPayload)
      .select("id, name, plan_id")
      .single();

    if (error) {
      console.error("[workout-focus POST]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    const row = data as { id: string; name: string; plan_id: string | null };
    return NextResponse.json({
      success: true,
      focus: {
        ...row,
        focus_moai_count: 0,
      } satisfies WorkoutFocusAdminRow,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
