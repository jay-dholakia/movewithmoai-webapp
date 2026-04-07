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

    // Step 1: Invalidate all existing unused custom tokens for this email
    await (admin.from("coach_invites" as any) as any)
      .update({ used_at: new Date().toISOString() })
      .eq("email", trimmedEmail)
      .is("used_at", null);

    // Step 2: Create a fresh custom token
    const { data: invite, error: inviteErr } = await (admin
      .from("coach_invites" as any)
      .insert({ email: trimmedEmail })
      .select("token")
      .single() as Promise<{ data: { token: string } | null; error: any }>);

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

    // Step 3: Find the existing auth user
    // The resend button only shows for signup_confirmed=false coaches, so they
    // haven't set a password yet — it's safe to delete and re-invite them.
    // This is the only way to send the invite email template (not reset password).
    const { data: listData } = await admin.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find(
      (u) => u.email === trimmedEmail,
    );

    if (existingAuthUser) {
      // Delete the unconfirmed auth user so inviteUserByEmail works again
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

    // Step 4: Re-invite — creates a new auth user and sends the invite email via your SMTP
    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(trimmedEmail, { redirectTo });

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

    // Step 5: Update the users table with the new auth user ID
    // (old auth user was deleted, new one has a different UUID)
    const { error: updateError } = await admin
      .from("users")
      .update({ id: inviteData.user.id })
      .eq("email", trimmedEmail);

    if (updateError) {
      console.error(
        "[resend-coach-invite] Failed to update user ID:",
        updateError,
      );
      // Non-fatal — invite was sent, just log it
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
