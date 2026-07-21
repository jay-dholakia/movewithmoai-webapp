// app/api/admin/coaches/[coachId]/disable/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

function getStripe() {
  if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
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

/** Verify Bearer token and return userId, or null + error response */
function verifyAuth(request: NextRequest): {
  userId: string | null;
  errorResponse: NextResponse | null;
} {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 20) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized: Invalid token format" },
        { status: 401 },
      ),
    };
  }

  try {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return {
        userId: null,
        errorResponse: NextResponse.json(
          { success: false, error: "Unauthorized: Invalid token format" },
          { status: 401 },
        ),
      };
    }
    const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      base64Payload + "=".repeat((4 - (base64Payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(decoded);
    const userId = payload.sub || payload.user_id;
    if (!userId) throw new Error("No user ID in token");
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return {
        userId: null,
        errorResponse: NextResponse.json(
          { success: false, error: "Unauthorized: Token expired" },
          { status: 401 },
        ),
      };
    }
    return { userId, errorResponse: null };
  } catch (e: any) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: " + (e?.message || "Token verification failed"),
        },
        { status: 401 },
      ),
    };
  }
}

async function verifyAdmin(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<NextResponse | null> {
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
  return null;
}

// ── GET: Preview what disabling this coach will affect ──────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coachId: string }> },
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { userId, errorResponse } = verifyAuth(request);
  if (errorResponse) return errorResponse;

  const adminClient = getSupabaseAdmin();
  const adminErr = await verifyAdmin(adminClient, userId!);
  if (adminErr) return adminErr;

  const { coachId } = await params;

  // Active moai coach subscriptions
  const { data: subscriptions, error: subErr } = (await (
    adminClient.from("moai_coach_subscriptions") as any
  )
    .select(
      "id, moai_id, payer_user_id, stripe_subscription_id, status, started_at, circles(name)",
    )
    .eq("coach_id", coachId)
    .eq("status", "active")) as { data: any[] | null; error: any };

  if (subErr) {
    return NextResponse.json(
      { success: false, error: subErr.message },
      { status: 500 },
    );
  }

  // Fetch coach monthly price
  const { data: coach } = (await (adminClient.from("coaches") as any)
    .select("monthly_price")
    .eq("id", coachId)
    .single()) as { data: any };

  const monthlyPrice = parseFloat(coach?.monthly_price || "0");
  const now = new Date();

  const subscriptionPreviews = (subscriptions || []).map((sub: any) => {
    const started = new Date(sub.started_at);
    const monthsSince = monthsBetween(started, now);
    const periodStart = addMonths(started, monthsSince);
    const periodEnd = addMonths(started, monthsSince + 1);
    const totalDays = daysBetween(periodStart, periodEnd);
    const elapsedDays = daysBetween(periodStart, now);
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const estimatedRefund =
      totalDays > 0
        ? Math.round((remainingDays / totalDays) * monthlyPrice * 100) / 100
        : 0;

    return {
      subscription_id: sub.id,
      moai_id: sub.moai_id,
      moai_name: sub.circles?.name || sub.moai_id,
      payer_user_id: sub.payer_user_id,
      stripe_subscription_id: sub.stripe_subscription_id,
      monthly_price: monthlyPrice,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      estimated_refund: estimatedRefund,
      days_remaining: remainingDays,
      total_days: totalDays,
    };
  });

  // Active focus moais
  const { data: focusMoais, error: fmErr } = (await (
    adminClient.from("focus_moais") as any
  )
    .select("id, name, status")
    .eq("coach_id", coachId)
    .eq("status", "active")) as { data: any[] | null; error: any };

  if (fmErr) {
    return NextResponse.json(
      { success: false, error: fmErr.message },
      { status: 500 },
    );
  }

  // Get member counts for focus moais
  const focusMoaiPreviews = await Promise.all(
    (focusMoais || []).map(async (fm: any) => {
      const { count } = await (adminClient.from("focus_moai_members") as any)
        .select("id", { count: "exact", head: true })
        .eq("focus_moai_id", fm.id)
        .eq("status", "active");

      return {
        id: fm.id,
        name: fm.name,
        member_count: count || 0,
        status: fm.status,
      };
    }),
  );

  const totalEstimatedRefund = subscriptionPreviews.reduce(
    (sum: number, s: any) => sum + s.estimated_refund,
    0,
  );

  return NextResponse.json({
    success: true,
    subscriptions: subscriptionPreviews,
    focus_moais: focusMoaiPreviews,
    total_estimated_refund: totalEstimatedRefund,
  });
}

// ── POST: Execute disable — reassign focus moais, cancel/refund regular subs ─
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ coachId: string }> },
) {
  console.log("POST /api/admin/coaches/[coachId]/disable called");

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { userId, errorResponse } = verifyAuth(request);
  if (errorResponse) return errorResponse;

  const adminClient = getSupabaseAdmin();
  const adminErr = await verifyAdmin(adminClient, userId!);
  if (adminErr) return adminErr;

  const { coachId } = await params;

  // Parse focusReplacements { [focus_moai_id]: replacementCoachId }
  let focusReplacements: Record<string, string> = {};
  try {
    const body = await request.json();
    focusReplacements = body?.focusReplacements ?? {};
  } catch {
    focusReplacements = {};
  }

  const warnings: string[] = [];
  const refundResults: Array<{
    subscription_id: string;
    moai_id: string;
    refund_amount_cents: number;
    stripe_refund_id: string | null;
  }> = [];

  try {
    const now = new Date();

    // Coach info (name/price) up front — needed for validation + messaging
    const { data: coach } = (await (adminClient.from("coaches") as any)
      .select("monthly_price, name")
      .eq("id", coachId)
      .single()) as { data: any };

    const monthlyPriceCents = Math.round(
      parseFloat(coach?.monthly_price || "0") * 100,
    );
    const coachName = coach?.name || "Your coach";

    // ── 0. VALIDATE focus-moai replacements BEFORE touching Stripe ──────────
    const { data: focusMoais } = (await (adminClient.from("focus_moais") as any)
      .select("id, name")
      .eq("coach_id", coachId)
      .eq("status", "active")) as { data: any[] | null };

    // Every active focus moai must have a replacement selected
    const missing = (focusMoais || []).filter(
      (fm: any) => !focusReplacements[fm.id],
    );
    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A replacement coach must be selected for every focus moai: " +
            missing.map((fm: any) => fm.name).join(", "),
        },
        { status: 400 },
      );
    }

    // Replacement can't be the coach being disabled
    const replacementIds = Array.from(
      new Set(Object.values(focusReplacements)),
    );
    if (replacementIds.includes(coachId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Replacement coach cannot be the coach being disabled",
        },
        { status: 400 },
      );
    }

    // All replacements must be active coaches
    if (replacementIds.length > 0) {
      const { data: validCoaches } = (await (adminClient.from("coaches") as any)
        .select("id")
        .in("id", replacementIds)
        .eq("is_available", true)
        .eq("is_deleted", false)) as { data: any[] | null };

      const validSet = new Set((validCoaches || []).map((c: any) => c.id));
      const invalid = replacementIds.filter((id) => !validSet.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "One or more replacement coaches are invalid or inactive",
          },
          { status: 400 },
        );
      }
    }

    // ── 1. Process active moai coach subscriptions (cancel + prorated refund)
    const { data: subscriptions } = (await (
      adminClient.from("moai_coach_subscriptions") as any
    )
      .select("id, moai_id, stripe_subscription_id, payer_user_id, started_at")
      .eq("coach_id", coachId)
      .eq("status", "active")) as { data: any[] | null };

    for (const sub of subscriptions || []) {
      try {
        const stripe = getStripe();

        const stripeSub = (await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id,
        )) as any;
        const periodStart: number = stripeSub.current_period_start;
        const periodEnd: number = stripeSub.current_period_end;
        const nowUnix = Math.floor(Date.now() / 1000);
        const totalSeconds = periodEnd - periodStart;
        const remainingSeconds = Math.max(0, periodEnd - nowUnix);
        const refundAmountCents =
          totalSeconds > 0
            ? Math.round((remainingSeconds / totalSeconds) * monthlyPriceCents)
            : 0;

        // Cancel subscription immediately
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);

        // Issue prorated refund on the latest invoice
        let stripeRefundId: string | null = null;
        if (refundAmountCents > 0) {
          const invoices = await stripe.invoices.list({
            subscription: sub.stripe_subscription_id,
            limit: 1,
          });
          const invoice = invoices.data[0] as any;
          const piId: string | null =
            typeof invoice?.payment_intent === "string"
              ? invoice.payment_intent
              : (invoice?.payment_intent?.id ?? null);
          if (piId) {
            const refund = await stripe.refunds.create({
              payment_intent: piId,
              amount: refundAmountCents,
              reason: "requested_by_customer",
            });
            stripeRefundId = refund.id;
          }
        }

        // Update subscription record with refund tracking
        await (adminClient.from("moai_coach_subscriptions") as any)
          .update({
            status: "cancelled",
            cancelled_at: now.toISOString(),
            ended_at: now.toISOString(),
            refund_amount_cents: refundAmountCents,
            refunded_at: refundAmountCents > 0 ? now.toISOString() : null,
            stripe_refund_id: stripeRefundId,
          })
          .eq("id", sub.id);

        refundResults.push({
          subscription_id: sub.id,
          moai_id: sub.moai_id,
          refund_amount_cents: refundAmountCents,
          stripe_refund_id: stripeRefundId,
        });

        // Send system message to moai chat
        await sendSystemMessage(
          adminClient,
          sub.moai_id,
          `${coachName} is no longer available as a coach. ` +
            (refundAmountCents > 0
              ? `A prorated refund of $${(refundAmountCents / 100).toFixed(2)} has been issued. `
              : "") +
            `Please select a new coach for your Moai.`,
        );
      } catch (err: any) {
        warnings.push(
          `Failed to process subscription ${sub.id}: ${err.message}`,
        );
      }
    }

    // ── 2. Reassign focus moais to their selected replacement coach ─────────
    for (const fm of focusMoais || []) {
      const newCoachId = focusReplacements[fm.id];
      try {
        await (adminClient.from("focus_moais") as any)
          .update({ coach_id: newCoachId, updated_at: now.toISOString() })
          .eq("id", fm.id);

        await sendSystemMessage(
          adminClient,
          fm.id,
          `Your focus moai has a new coach. ${coachName} has stepped down and a replacement coach has been assigned.`,
        );
      } catch (err: any) {
        warnings.push(
          `Failed to reassign focus moai ${fm.name}: ${err.message}`,
        );
      }
    }

    // ── 3. Set coach as unavailable ─────────────────────────────────────────
    const { error: coachErr } = await (adminClient.from("coaches") as any)
      .update({ is_available: false })
      .eq("id", coachId);

    if (coachErr) {
      return NextResponse.json(
        { success: false, error: "Failed to update coach status" },
        { status: 500 },
      );
    }

    console.log(
      `✅ [API] Coach ${coachId} disabled. Subscriptions cancelled: ${(subscriptions || []).length}, Focus moais reassigned: ${(focusMoais || []).length}`,
    );

    return NextResponse.json({
      success: true,
      warnings,
      refunds: refundResults,
      subscriptions_cancelled: (subscriptions || []).length,
      focus_moais_reassigned: (focusMoais || []).length,
    });
  } catch (err: any) {
    console.error("Error disabling coach:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function sendSystemMessage(
  supabase: ReturnType<typeof createClient>,
  moaiId: string,
  message: string,
) {
  const { data: chat } = (await (supabase.from("moai_chats") as any)
    .select("id")
    .eq("circle_id", moaiId)
    .single()) as { data: any };

  if (!chat) return;

  const now = new Date().toISOString();
  await (supabase.from("moai_chat_messages") as any).insert({
    moai_chat_id: chat.id,
    sender_id: null,
    message,
    timestamp: now,
    is_system_message: true,
    is_deleted: false,
    is_edited: false,
    is_coach: false,
    media_type: null,
    media_storage_path: null,
    media_note: null,
    reply_parent_message_id: null,
  });

  await (supabase.from("moai_chats") as any)
    .update({ last_message_at: now, updated_at: now })
    .eq("id", chat.id);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
