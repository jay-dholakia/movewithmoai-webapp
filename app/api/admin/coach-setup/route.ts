import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { inviteToken, email, password, username } = await req.json();

  const { data: invite } = await adminSupabase
    .from("coach_invites")
    .select("email, expires_at, used_at")
    .eq("token", inviteToken)
    .single();

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({
      success: false,
      error: "Invite invalid or expired",
    });
  }

  const { data: userData } = await adminSupabase.auth.admin.listUsers();
  const user = userData?.users.find((u) => u.email === email);

  if (!user) {
    return NextResponse.json({
      success: false,
      error: "Coach account not found",
    });
  }

  const { error: pwError } = await adminSupabase.auth.admin.updateUserById(
    user.id,
    { password },
  );
  if (pwError) {
    return NextResponse.json({ success: false, error: pwError.message });
  }

  const { error: usernameError } = await adminSupabase
    .from("users")
    .update({ username })
    .eq("id", user.id);

  if (usernameError) {
    return NextResponse.json({
      success: false,
      error: "Failed to save username",
    });
  }

  return NextResponse.json({ success: true });
}
