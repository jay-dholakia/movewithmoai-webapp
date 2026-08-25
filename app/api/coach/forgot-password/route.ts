import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function getAppUrl(): string {
  const isProd = process.env.ENV?.trim().toLowerCase() === "production";
  const raw = isProd
    ? process.env.NEXT_PUBLIC_APP_URL_PROD?.trim()
    : process.env.NEXT_PUBLIC_APP_URL_DEV?.trim();

  const fallback =
    process.env.NEXT_PUBLIC_APP_URL_DEV?.trim() || "http://localhost:3000";

  // Strip trailing slash so we don't build "…//coach/reset-password"
  return (raw || fallback).replace(/\/$/, "");
}

const APP_URL = getAppUrl();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = (body?.email || "").trim();
    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }
    const email = rawEmail.toLowerCase();

    const admin = getSupabaseAdmin();

    const { data: user } = await admin
      .from("users")
      .select("id, role, is_deleted, email")
      .ilike("email", email)
      .maybeSingle();

    const isCoach = user && !user.is_deleted && user.role === "coach";

    if (isCoach) {
      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/coach/reset-password`,
      });
      if (error) {
        console.error("[coach/forgot-password] resetPasswordForEmail:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[coach/forgot-password]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
