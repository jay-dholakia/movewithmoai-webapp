import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
/** Prefer server-only `SUPABASE_SERVICE_ROLE_KEY` (e.g. Vercel). Falls back for local .env that only has the public-prefixed var. */
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim();

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY for local only).",
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function verifyAdminRequest(
  request: NextRequest,
): Promise<{ userId: string } | { error: NextResponse }> {
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
    .select("role")
    .eq("id", userId)
    .single();
  if (!user || user.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }
  return { userId };
}
