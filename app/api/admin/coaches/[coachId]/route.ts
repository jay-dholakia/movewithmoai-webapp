import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type RouteContext = { params: Promise<{ coachId: string }> };

async function activeMoaiCountForCoach(
  admin: ReturnType<typeof getSupabaseAdmin>,
  coachId: string,
): Promise<number> {
  const { data: subs, error: subError } = await admin
    .from("moai_coach_subscriptions")
    .select("moai_id")
    .eq("coach_id", coachId)
    .eq("status", "active");

  if (subError || !subs?.length) return 0;

  const moaiIds = [
    ...new Set(subs.map((s: { moai_id: string }) => s.moai_id).filter(Boolean)),
  ];
  if (moaiIds.length === 0) return 0;

  const { data: circles, error: circlesError } = await admin
    .from("circles")
    .select("id")
    .in("id", moaiIds)
    .eq("status", "active");

  if (circlesError) return 0;
  const active = new Set(circles?.map((c) => c.id) || []);
  return subs.filter(
    (s: { moai_id: string }) => s.moai_id && active.has(s.moai_id),
  ).length;
}

async function signupConfirmed(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    return !!authUser?.user?.last_sign_in_at;
  } catch {
    return false;
  }
}

function mapCoachRow(
  coach: Record<string, unknown>,
  currentMoais: number,
  signup_confirmed: boolean,
) {
  return {
    id: coach.id,
    user_id: coach.user_id,
    name: coach.name,
    email: coach.email,
    first_name: coach.first_name,
    last_name: coach.last_name,
    bio: coach.bio ?? null,
    specializations: (coach.specializations as string[] | null) ?? [],
    calendly_event_uri: (coach.calendly_event_uri as string | null) ?? null,
    is_available: coach.is_available || false,
    current_clients: coach.current_clients || 0,
    max_clients: coach.max_clients || 50,
    current_moais: currentMoais,
    max_moais: coach.max_moais || 10,
    created_at: coach.created_at,
    profile_image_url: coach.profile_image_url,
    signup_confirmed,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifyAdminRequest(request);
    if ("error" in authResult) return authResult.error;

    const { coachId } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: coach, error } = await admin
      .from("coaches")
      .select("*")
      .eq("id", coachId)
      .maybeSingle();

    if (error) {
      console.error("[admin/coaches/[coachId]] GET:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to load coach" },
        { status: 500 },
      );
    }

    if (!coach) {
      return NextResponse.json(
        { success: false, error: "Coach not found" },
        { status: 404 },
      );
    }

    const row = coach as Record<string, unknown>;
    const currentMoais = await activeMoaiCountForCoach(admin, coachId);
    const confirmed = await signupConfirmed(
      admin,
      row.user_id as string | null | undefined,
    );

    return NextResponse.json({
      success: true,
      coach: mapCoachRow(row, currentMoais, confirmed),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/coaches/[coachId]] GET:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifyAdminRequest(request);
    if ("error" in authResult) return authResult.error;

    const { coachId } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: existing, error: loadError } = await admin
      .from("coaches")
      .select("id")
      .eq("id", coachId)
      .maybeSingle();

    if (loadError || !existing) {
      return NextResponse.json(
        { success: false, error: "Coach not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.first_name === "string")
      updates.first_name = body.first_name.trim();
    if (body.last_name === null || typeof body.last_name === "string") {
      updates.last_name =
        body.last_name === null ? null : String(body.last_name).trim();
    }
    if (body.bio === null || typeof body.bio === "string")
      updates.bio = body.bio === null ? null : String(body.bio);
    if (Array.isArray(body.specializations))
      updates.specializations = body.specializations.map((s) => String(s));
    if (typeof body.is_available === "boolean")
      updates.is_available = body.is_available;
    if (typeof body.max_clients === "number" && body.max_clients >= 1)
      updates.max_clients = Math.min(500, Math.floor(body.max_clients));
    if (typeof body.max_moais === "number" && body.max_moais >= 0)
      updates.max_moais = Math.min(100, Math.floor(body.max_moais));
    if (body.calendly_event_uri === null || typeof body.calendly_event_uri === "string") {
      updates.calendly_event_uri =
        body.calendly_event_uri === null || body.calendly_event_uri === ""
          ? null
          : String(body.calendly_event_uri).trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("coaches")
      .update(updates)
      .eq("id", coachId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[admin/coaches/[coachId]] PATCH update:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message || "Failed to update coach",
        },
        { status: 500 },
      );
    }

    const row = updated as Record<string, unknown>;
    const currentMoais = await activeMoaiCountForCoach(admin, coachId);
    const confirmed = await signupConfirmed(
      admin,
      row.user_id as string | null | undefined,
    );

    return NextResponse.json({
      success: true,
      coach: mapCoachRow(row, currentMoais, confirmed),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/coaches/[coachId]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
