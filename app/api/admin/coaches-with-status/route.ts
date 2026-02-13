import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token || token.length < 20) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  let userId: string | null = null
  try {
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
    }
    const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64Payload + '='.repeat((4 - (base64Payload.length % 4)) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    userId = payload.sub || payload.user_id

    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { error: NextResponse.json({ success: false, error: 'Token expired' }, { status: 401 }) }
    }
  } catch {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!userId) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = getSupabaseAdmin()
  const { data: user } = await admin.from('users').select('role').eq('id', userId).single()
  if (!user || user.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('error' in authResult) return authResult.error

    const admin = getSupabaseAdmin()

    const { data: coaches, error: coachesError } = await admin
      .from('coaches')
      .select('*')
      .order('created_at', { ascending: false })

    if (coachesError) {
      console.error('[coaches-with-status] Error fetching coaches:', coachesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coaches' },
        { status: 500 }
      )
    }

    const { data: allSubscriptions } = await admin
      .from('moai_coach_subscriptions')
      .select('coach_id, status, moai_id')
      .eq('status', 'active')

    const moaiCountMap = new Map<string, number>()
    if (allSubscriptions && allSubscriptions.length > 0) {
      const moaiIds = [...new Set(allSubscriptions.map((s: { moai_id: string }) => s.moai_id).filter(Boolean))]
      if (moaiIds.length > 0) {
        const { data: circles } = await admin
          .from('circles')
          .select('id, status')
          .in('id', moaiIds)
          .eq('status', 'active')
        const activeCircleIds = new Set(circles?.map((c) => c.id) || [])
        allSubscriptions.forEach((sub: { coach_id: string; moai_id: string }) => {
          if (sub.coach_id && sub.moai_id && activeCircleIds.has(sub.moai_id)) {
            moaiCountMap.set(sub.coach_id, (moaiCountMap.get(sub.coach_id) || 0) + 1)
          }
        })
      }
    }

    const coachesWithStatus = await Promise.all(
      (coaches || []).map(async (coach) => {
        let signupConfirmed = false
        if (coach.user_id) {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(coach.user_id)
            signupConfirmed = !!(authUser?.user?.last_sign_in_at)
          } catch {
            signupConfirmed = false
          }
        }

        return {
          id: coach.id,
          user_id: coach.user_id,
          name: coach.name,
          email: coach.email,
          first_name: coach.first_name,
          last_name: coach.last_name,
          is_available: coach.is_available || false,
          current_clients: coach.current_clients || 0,
          max_clients: coach.max_clients || 50,
          current_moais: moaiCountMap.get(coach.id) ?? coach.current_moais ?? 0,
          max_moais: coach.max_moais || 10,
          created_at: coach.created_at,
          profile_image_url: coach.profile_image_url,
          signup_confirmed: signupConfirmed,
        }
      })
    )

    return NextResponse.json({ coaches: coachesWithStatus })
  } catch (err) {
    console.error('[coaches-with-status] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
