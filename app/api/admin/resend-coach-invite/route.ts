// import { type NextRequest, NextResponse } from 'next/server'
// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// function getSupabaseAdmin() {
//   if (!supabaseUrl || !supabaseServiceKey) {
//     throw new Error('Missing Supabase configuration')
//   }
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   })
// }

// async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | { error: NextResponse }> {
//   const authHeader = request.headers.get('authorization')
//   if (!authHeader) {
//     return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
//   }

//   const token = authHeader.replace('Bearer ', '')
//   if (!token || token.length < 20) {
//     return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
//   }

//   let userId: string | null = null
//   try {
//     const tokenParts = token.split('.')
//     if (tokenParts.length !== 3) {
//       return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
//     }
//     const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
//     const padded = base64Payload + '='.repeat((4 - (base64Payload.length % 4)) % 4)
//     const decoded = Buffer.from(padded, 'base64').toString('utf-8')
//     const payload = JSON.parse(decoded)
//     userId = payload.sub || payload.user_id

//     if (payload.exp && payload.exp < Date.now() / 1000) {
//       return { error: NextResponse.json({ success: false, error: 'Token expired' }, { status: 401 }) }
//     }
//   } catch {
//     return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
//   }

//   if (!userId) {
//     return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
//   }

//   const admin = getSupabaseAdmin()
//   const { data: user } = await admin.from('users').select('role').eq('id', userId).single()
//   if (!user || user.role !== 'admin') {
//     return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
//   }

//   return { userId }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const authResult = await verifyAdmin(request)
//     if ('error' in authResult) return authResult.error

//     const body = await request.json()
//     const { email } = body

//     if (!email || typeof email !== 'string') {
//       return NextResponse.json(
//         { success: false, error: 'Email is required' },
//         { status: 400 }
//       )
//     }

//     const admin = getSupabaseAdmin()
//     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://withmoai.co'

//     const { data, error } = await admin.auth.admin.generateLink({
//       type: 'invite',
//       email: email.trim(),
//       options: {
//         redirectTo: `${siteUrl}/coach/setup-password`,
//       },
//     })

//     if (error) {
//       console.error('[resend-coach-invite] generateLink error:', error)
//       return NextResponse.json(
//         {
//           success: false,
//           error: error.message || 'Failed to generate invite link',
//         },
//         { status: 500 }
//       )
//     }

//     const inviteLink = data?.properties?.action_link
//     if (!inviteLink) {
//       return NextResponse.json(
//         { success: false, error: 'Failed to generate invite link' },
//         { status: 500 }
//       )
//     }

//     return NextResponse.json({
//       success: true,
//       inviteLink,
//       message: 'Copy this link and send it to the coach. Invite links expire in 24 hours.',
//     })
//   } catch (err) {
//     console.error('[resend-coach-invite] Error:', err)
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }

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

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://withmoai.co";

    // Try invite link first; if user already exists, fall back to recovery (password reset) link.
    // Both redirect to /coach/setup-password and behave identically for the coach.
    let data, error;

    const inviteResult = await admin.auth.admin.generateLink({
      type: "invite",
      email: email.trim(),
      options: { redirectTo: `${siteUrl}/coach/setup-password` },
    });

    if (inviteResult.error) {
      // User already exists in auth — generate a password reset link instead
      const recoveryResult = await admin.auth.admin.generateLink({
        type: "recovery",
        email: email.trim(),
        options: { redirectTo: `${siteUrl}/coach/setup-password` },
      });
      data = recoveryResult.data;
      error = recoveryResult.error;
    } else {
      data = inviteResult.data;
      error = inviteResult.error;
    }

    if (error) {
      console.error("[resend-coach-invite] generateLink error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to generate invite link",
        },
        { status: 500 },
      );
    }

    const inviteLink = data?.properties?.action_link;
    if (!inviteLink) {
      return NextResponse.json(
        { success: false, error: "Failed to generate invite link" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      inviteLink,
      message:
        "Copy this link and send it to the coach. Invite links expire in 24 hours.",
    });
  } catch (err) {
    console.error("[resend-coach-invite] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
