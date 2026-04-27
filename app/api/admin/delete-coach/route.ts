import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

function getStripe() {
  if (!stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function extractUserId(token: string): string {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('Token expired')
  const id = payload.sub || payload.user_id
  if (!id) throw new Error('No user ID in token')
  return id
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let requestingUserId: string
    try {
      requestingUserId = extractUserId(authHeader.replace('Bearer ', ''))
    } catch (e: any) {
      return NextResponse.json({ success: false, error: 'Unauthorized: ' + e.message }, { status: 401 })
    }

    const { coachId } = await request.json()
    if (!coachId) {
      return NextResponse.json({ success: false, error: 'coachId is required' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()

    // Verify requester is admin
    const { data: adminUser, error: adminErr } = await adminClient
      .from('users')
      .select('role')
      .eq('id', requestingUserId)
      .single()

    if (adminErr || adminUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Fetch coach record
    const { data: coach, error: coachErr } = await adminClient
      .from('coaches')
      .select('id, user_id, email, name, stripe_product_id, stripe_price_id')
      .eq('id', coachId)
      .single()

    if (coachErr || !coach) {
      return NextResponse.json({ success: false, error: 'Coach not found' }, { status: 404 })
    }

    const warnings: string[] = []

    // ── 1. Cancel active individual Stripe subscriptions ──────────────────
    const { data: activeSubs } = await adminClient
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('assigned_coach_id', coachId)
      .in('status', ['active', 'trial'])

    if (activeSubs && activeSubs.length > 0 && stripeSecretKey) {
      const stripe = getStripe()
      for (const sub of activeSubs) {
        if (sub.stripe_subscription_id) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id)
          } catch (err: any) {
            warnings.push(`Could not cancel Stripe subscription ${sub.stripe_subscription_id}: ${err.message}`)
          }
        }
      }
    }

    // Nullify assigned_coach_id — users keep their subscription records
    await adminClient
      .from('subscriptions')
      .update({ assigned_coach_id: null })
      .eq('assigned_coach_id', coachId)

    // ── 2. Cancel active Moai coach subscriptions ─────────────────────────
    const { data: moaiSubs } = await adminClient
      .from('moai_coach_subscriptions')
      .select('id, stripe_subscription_id')
      .eq('coach_id', coachId)
      .eq('status', 'active')

    if (moaiSubs && moaiSubs.length > 0 && stripeSecretKey) {
      const stripe = getStripe()
      for (const sub of moaiSubs) {
        if (sub.stripe_subscription_id) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id)
          } catch (err: any) {
            warnings.push(`Could not cancel Moai Stripe subscription ${sub.stripe_subscription_id}: ${err.message}`)
          }
        }
      }
    }

    await adminClient
      .from('moai_coach_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('coach_id', coachId)
      .neq('status', 'cancelled')

    // ── 3. Archive Stripe product ─────────────────────────────────────────
    if (coach.stripe_product_id && stripeSecretKey) {
      try {
        const stripe = getStripe()
        await stripe.products.update(coach.stripe_product_id, { active: false })
      } catch (err: any) {
        warnings.push(`Could not archive Stripe product: ${err.message}`)
      }
    }

    // ── 4. Soft-delete the coaches row ────────────────────────────────────
    // All chats, notes, and messages are preserved so circle history stays intact.
    const { error: coachUpdateErr } = await adminClient
      .from('coaches')
      .update({ is_deleted: true, is_available: false })
      .eq('id', coachId)

    if (coachUpdateErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to soft-delete coach record: ' + coachUpdateErr.message },
        { status: 500 },
      )
    }

    // ── 5. Soft-delete the users row ──────────────────────────────────────
    if (coach.user_id) {
      await adminClient
        .from('users')
        .update({ is_deleted: true })
        .eq('id', coach.user_id)

      // Hard-delete the auth user so they can no longer sign in
      const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(coach.user_id)
      if (authDeleteErr) {
        warnings.push(`Auth user deletion failed: ${authDeleteErr.message}`)
      }
    }

    return NextResponse.json({ success: true, warnings: warnings.length > 0 ? warnings : undefined })
  } catch (error: any) {
    console.error('Unhandled exception in delete-coach:', error?.message)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete coach' },
      { status: 500 },
    )
  }
}
