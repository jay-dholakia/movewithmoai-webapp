import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!

function getStripe() {
  if (!stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  console.log("POST /api/admin/create-coach called");
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing environment variables.",
        },
        { status: 500 },
      );
    }

    if (!supabaseServiceKey.startsWith("eyJ")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error: SUPABASE_SERVICE_ROLE_KEY format is invalid.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      email,
      first_name,
      last_name,
      is_available = false,
      max_clients = 50,
      max_moais = 10,
      bio = null,
      specializations = [],
      monthly_price = 15.00,
    } = body

    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, first name, and last name are required",
        },
        { status: 400 },
      );
    }

    // ── Auth / admin check ─────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 20) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid token format" },
        { status: 401 },
      );
    }

    let userId: string | null = null;
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid token format" },
          { status: 401 },
        );
      }
      const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded =
        base64Payload + "=".repeat((4 - (base64Payload.length % 4)) % 4);
      const decoded = Buffer.from(padded, "base64").toString("utf-8");
      const payload = JSON.parse(decoded);
      userId = payload.sub || payload.user_id;
      if (!userId) throw new Error("No user ID in token");
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Token expired" },
          { status: 401 },
        );
      }
    } catch (e: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: " + (e?.message || "Token verification failed"),
        },
        { status: 401 },
      );
    }

    const adminClient = getSupabaseAdmin();

    // Admin role check
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("role, email")
      .eq("id", userId)
      .eq("role", "admin")
      .single();

    let isAdmin = !!userData && !userError;
    if (!isAdmin) {
      const { data: fallback, error: fallbackErr } = await adminClient
        .from("users")
        .select("role, email")
        .eq("id", userId)
        .single();

      if (!fallbackErr && (fallback as any)?.role === "admin") {
        isAdmin = true;
      } else {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 },
        );
      }
    }

    const { data: existingUser } = await adminClient
      .from("users")
      .select("id, role")
      .eq("email", email)
      .eq("is_deleted", false)
      .returns<{ id: string; role: string }[]>()
      .single();

    if (existingUser?.role === "coach") {
      return NextResponse.json(
        { success: false, error: "A coach with this email already exists" },
        { status: 400 },
      );
    }

    const { data: invite, error: inviteErr } = (await (
      adminClient.from("coach_invites") as any
    )
      .insert({ email })
      .select("token")
      .single()) as unknown as { data: { token: string } | null; error: any };

    if (inviteErr || !invite) {
      console.error("Failed to create invite token:", inviteErr);
      return NextResponse.json(
        { success: false, error: "Failed to generate invite token" },
        { status: 500 },
      );
    }

    // ── Step 2: Send invite email via your Supabase SMTP ──────────────────
    // inviteUserByEmail uses the SMTP you configured in Supabase.
    // Our custom token is embedded in redirectTo so the setup page uses it
    // instead of the fragile one-time Supabase hash token.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectTo = `${siteUrl}/coach/setup-password?invite=${invite.token}`;

    console.log("Sending invite email, redirectTo:", redirectTo);

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { first_name, last_name, user_type: "coach" },
        redirectTo,
      });

    if (inviteError || !inviteData?.user) {
      console.error("Error sending invitation email:", inviteError);
      await (adminClient.from("coach_invites" as any) as any)
        .delete()
        .eq("token", invite.token);
      return NextResponse.json(
        {
          success: false,
          error: inviteError?.message || "Failed to send invitation email",
        },
        { status: 500 },
      );
    }

    const authUser = inviteData.user;
    console.log("Invite email sent, auth user id:", authUser.id);

    // ── Step 3: Create users + coaches DB records via RPC ─────────────────
    const { data: result, error: rpcError } = await adminClient.rpc(
      "create_coach_records",
      {
        p_user_id: authUser.id,
        p_email: email,
        p_first_name: first_name,
        p_last_name: last_name,
        p_is_available: is_available,
        p_max_clients: max_clients,
        p_max_moais: max_moais,
        p_bio: bio,
        p_specializations: specializations || [],
      } as any,
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      await adminClient.auth.admin.deleteUser(authUser.id);
      await (adminClient.from("coach_invites" as any) as any)
        .delete()
        .eq("token", invite.token);
      return NextResponse.json(
        {
          success: false,
          error: rpcError.message || "Failed to create coach records",
        },
        { status: 500 },
      );
    }

    if (!result || (result as any)?.success !== true) {
      await adminClient.auth.admin.deleteUser(authUser.id);
      await (adminClient.from("coach_invites" as any) as any)
        .delete()
        .eq("token", invite.token);
      return NextResponse.json(
        {
          success: false,
          error: (result as any)?.error || "Failed to create coach records",
        },
        { status: 500 },
      );
    }

    const rpcResult = result as any
    const coachId: string = rpcResult.coach_id

    console.log('✅ [API] Coach account created successfully!')

    // Create a Stripe product + price for this coach
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null
    try {
      const stripe = getStripe()
      const coachFullName = `${first_name.trim()} ${last_name.trim()}`

      const product = await stripe.products.create({
        name: coachFullName,
        metadata: { type: 'coach_subscription', coach_id: coachId },
      })

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(monthly_price * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { type: 'coach_subscription', coach_id: coachId },
      })

      stripeProductId = product.id
      stripePriceId = price.id
      console.log('✅ [API] Stripe product/price created:', { stripeProductId, stripePriceId })

      await (adminClient
        .from('coaches') as any)
        .update({
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId,
          monthly_price,
        })
        .eq('id', coachId)
    } catch (stripeErr: any) {
      // Non-fatal: coach is created, log the Stripe failure for manual recovery
      console.error('⚠️ [API] Stripe product creation failed (coach still created):', stripeErr?.message)
    }

    return NextResponse.json({
      success: true,
      coachId,
      userId: rpcResult.user_id,
      stripeProductId,
      stripePriceId,
    })
  } catch (error: any) {
    console.error("Unhandled exception:", error?.message, error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create coach account",
        details:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
