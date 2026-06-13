import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
    const userId: string = payload.sub || payload.user_id
    if (!userId) return null
    if (payload.exp && payload.exp < Date.now() / 1000) return null

    const { data, error } = await getAdminClient()
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || (data as any)?.role !== 'admin') return null
    return userId
  } catch {
    return null
  }
}

// GET /api/admin/moderation/comments — all inReview comments with post + author
export async function GET(request: NextRequest) {
  const adminId = await verifyAdmin(request)
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getAdminClient()

  const { data, error } = await client
    .from('community_post_comments')
    .select(`
      id,
      post_id,
      user_id,
      content,
      created_at,
      status,
      author:users!community_post_comments_user_id_fkey (
        id,
        first_name,
        last_name,
        username,
        profile_picture_url
      ),
      post:community_posts (
        id,
        content,
        created_at,
        post_author:users!community_posts_user_id_fkey (
          id,
          first_name,
          last_name,
          username,
          profile_picture_url
        )
      )
    `)
    .eq('status', 'inReview')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending comments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ comments: data || [] })
}

// PATCH /api/admin/moderation/comments — approve or reject a comment
export async function PATCH(request: NextRequest) {
  const adminId = await verifyAdmin(request)
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { commentId, status } = body

  if (!commentId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json(
      { error: 'commentId and status (approved|rejected) are required' },
      { status: 400 },
    )
  }

  const client = getAdminClient()

  const { error } = await client
    .from('community_post_comments')
    .update({ status })
    .eq('id', commentId)

  if (error) {
    console.error('Error updating comment status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
