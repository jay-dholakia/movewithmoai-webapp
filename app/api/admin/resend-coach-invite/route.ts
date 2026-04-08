import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(
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

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if ("error" in authResult) return authResult.error;

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://withmoai.co";
    const trimmedEmail = email.trim();

    // Step 1: Fetch existing coach data BEFORE we delete anything
    // We need this to recreate the records after re-invite assigns a new auth UUID
    const { data: existingCoach, error: coachFetchError } = await admin
      .from("coaches")
      .select(
        "first_name, last_name, is_available, max_clients, max_moais, bio, specializations",
      )
      .eq("email", trimmedEmail)
      .single();

    if (coachFetchError || !existingCoach) {
      console.error(
        "[resend-coach-invite] Could not find coach record:",
        coachFetchError,
      );
      return NextResponse.json(
        { success: false, error: "Coach not found" },
        { status: 404 },
      );
    }

    // Step 2: Invalidate all existing unused custom tokens for this email
    await (admin.from("coach_invites" as any) as any)
      .update({ used_at: new Date().toISOString() })
      .eq("email", trimmedEmail)
      .is("used_at", null);

    const { data: invite, error: inviteErr } = (await (
      admin.from("coach_invites") as any
    )
      .insert({ email: trimmedEmail })
      .select("token")
      .single()) as unknown as { data: { token: string } | null; error: any };

    if (inviteErr || !invite) {
      console.error(
        "[resend-coach-invite] Failed to create invite token:",
        inviteErr,
      );
      return NextResponse.json(
        { success: false, error: "Failed to create invite token" },
        { status: 500 },
      );
    }

    const redirectTo = `${siteUrl}/coach/setup-password?invite=${invite.token}`;

    // Step 4: Find and delete the existing unconfirmed auth user
    // The resend button only shows for signup_confirmed=false, so they've never
    // set a password — safe to delete. This is the only way to re-send the
    // invite email template (inviteUserByEmail rejects existing users).
    const { data: listData } = await admin.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find(
      (u) => u.email === trimmedEmail,
    );

    if (existingAuthUser) {
      // Delete coaches + users DB records first to avoid FK constraint errors
      await admin.from("coaches").delete().eq("email", trimmedEmail);
      await admin.from("users").delete().eq("email", trimmedEmail);

      const { error: deleteError } = await admin.auth.admin.deleteUser(
        existingAuthUser.id,
      );
      if (deleteError) {
        console.error(
          "[resend-coach-invite] Failed to delete auth user:",
          deleteError,
        );
        await (admin.from("coach_invites" as any) as any)
          .delete()
          .eq("token", invite.token);
        return NextResponse.json(
          { success: false, error: "Failed to resend invite" },
          { status: 500 },
        );
      }
    }

    // Step 5: Re-invite — creates a fresh auth user and sends the invite email via your SMTP
    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
        data: {
          first_name: existingCoach.first_name,
          last_name: existingCoach.last_name,
          user_type: "coach",
        },
        redirectTo,
      });

    if (inviteError || !inviteData?.user) {
      console.error(
        "[resend-coach-invite] inviteUserByEmail failed:",
        inviteError,
      );
      await (admin.from("coach_invites" as any) as any)
        .delete()
        .eq("token", invite.token);
      return NextResponse.json(
        {
          success: false,
          error: inviteError?.message || "Failed to send invite email",
        },
        { status: 500 },
      );
    }

    // Step 6: Recreate the users + coaches DB records with the new auth UUID via RPC
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "create_coach_records",
      {
        p_user_id: inviteData.user.id,
        p_email: trimmedEmail,
        p_first_name: existingCoach.first_name,
        p_last_name: existingCoach.last_name,
        p_is_available: existingCoach.is_available,
        p_max_clients: existingCoach.max_clients,
        p_max_moais: existingCoach.max_moais,
        p_bio: existingCoach.bio ?? null,
        p_specializations: existingCoach.specializations ?? [],
      } as any,
    );

    if (rpcError || (rpcResult as any)?.success !== true) {
      console.error(
        "[resend-coach-invite] Failed to recreate coach records:",
        rpcError ?? rpcResult,
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resend-coach-invite] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
