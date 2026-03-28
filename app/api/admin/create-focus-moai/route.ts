import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey)
    throw new Error("Missing Supabase config");
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getStripe() {
  if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
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
  let userId: string | null = null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT");
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
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
    const {
      name,
      description,
      workout_focus_id,
      coach_id,
      max_members,
      price_monthly,
    } = body;

    // Validate
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }
    if (!price_monthly || price_monthly <= 0) {
      return NextResponse.json(
        { success: false, error: "Price must be greater than 0" },
        { status: 400 },
      );
    }
    if (!max_members || max_members < 1) {
      return NextResponse.json(
        { success: false, error: "Max members must be at least 1" },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const admin = getSupabaseAdmin();

    // 1. Create Stripe product
    const product = await stripe.products.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      metadata: {
        type: "focus_moai",
        max_members: String(max_members),
      },
    });

    // 2. Create Stripe recurring price (monthly)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price_monthly * 100), // cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
      metadata: {
        type: "focus_moai",
      },
    });

    // 3. Save to DB
    const { data, error: dbError } = await admin
      .from("focus_moais")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        workout_focus_id: workout_focus_id || null,
        coach_id: coach_id || null,
        max_members,
        price_monthly,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        status: "active",
      })
      .select("id")
      .single();

    if (dbError) {
      // Rollback Stripe objects
      console.error("DB error, rolling back Stripe objects:", dbError);
      await stripe.products.update(product.id, { active: false });
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, focusMoaiId: data.id });
  } catch (err: any) {
    console.error("[create-focus-moai] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
