import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type CoachAuth = {
  userId: string;
  coachId: string;
};

export async function verifyCoachRequest(
  request: NextRequest,
): Promise<CoachAuth | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 20) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  let userId: string | null = null;
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return {
        error: NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }
    const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      base64Payload + "=".repeat((4 - (base64Payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(decoded);
    userId = payload.sub || payload.user_id;
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return {
        error: NextResponse.json(
          { success: false, error: "Token expired" },
          { status: 401 },
        ),
      };
    }
  } catch {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (!userId) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from("users")
    .select("role, is_deleted")
    .eq("id", userId)
    .single();
  if (!user || user.is_deleted || user.role !== "coach") {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  const { data: coach } = await admin
    .from("coaches")
    .select("id, is_deleted")
    .eq("user_id", userId)
    .single();
  if (!coach || coach.is_deleted) {
    return {
      error: NextResponse.json(
        { success: false, error: "Coach profile not found" },
        { status: 403 },
      ),
    };
  }

  return { userId, coachId: coach.id };
}
