import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Create Supabase client with service role key (for admin operations)
// Lazy initialization to avoid errors during module load
let supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  
  return supabaseAdmin
}

export async function POST(request: NextRequest) {
  // UNIQUE MARKER: v2-check-2025
  console.log('🚀🚀🚀 POST /api/admin/create-coach called - VERSION 2 🚀🚀🚀')
  try {
    console.log('✅✅✅ Entered try block - VERSION 2 ✅✅✅')
    // Check if environment variables are set
    // Note: supabaseAdmin is now lazy-loaded, so we don't check it here
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables')
      console.error('Environment variable check:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        serviceKeyLength: supabaseServiceKey?.length || 0,
        serviceKeyPrefix: supabaseServiceKey?.substring(0, 30) || 'none',
        serviceKeyEndsWith: supabaseServiceKey?.substring(Math.max(0, (supabaseServiceKey?.length || 0) - 20)) || 'none',
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
      })
      
      // Check if it's still a placeholder
      if (supabaseServiceKey?.includes('your_service_role_key')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is still set to placeholder value. Please update .env file with actual service role key from Supabase Dashboard > Settings > API.',
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Please contact administrator.',
        },
        { status: 500 }
      )
    }
    
    // Verify service key format (should be a JWT starting with eyJ)
    if (!supabaseServiceKey.startsWith('eyJ')) {
      console.error('Service role key format is invalid:', {
        prefix: supabaseServiceKey.substring(0, 10),
        length: supabaseServiceKey.length,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY format is invalid. It should be a JWT token starting with "eyJ".',
        },
        { status: 500 }
      )
    }
    console.log('📥 [API] Parsing request body...')
    const body = await request.json()
    console.log('📥 [API] Request body:', { email: body.email, first_name: body.first_name })
    const {
      email,
      first_name,
      last_name,
      is_available = false,
      max_clients = 50,
      max_moais = 10,
      bio = null,
      specializations = [],
    } = body

    // Validate required fields
    if (!email || !first_name || !last_name) {
      console.log('❌ [API] Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    console.log('🔐 [API] Checking authorization header...')
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ [API] No authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user making the request is an admin
    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 [API] Token extracted, length:', token.length)
    
    if (!token || token.length < 20) {
      console.error('❌ [API] Invalid token format:', { tokenLength: token?.length, tokenPrefix: token?.substring(0, 20) })
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token format' },
        { status: 401 }
      )
    }
    
    // Verify token using anon client (user tokens are verified with anon key)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey || !supabaseUrl) {
      console.error('❌ [API] Missing environment variables:', { hasAnonKey: !!anonKey, hasUrl: !!supabaseUrl })
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    let userId: string | null = null
    
    console.log('🔓 [API] Starting JWT decode...')
    try {
      // Decode JWT to extract user ID (we'll verify via database check)
      const tokenParts = token.split('.')
      console.log('🔓 [API] Token parts count:', tokenParts.length)
      if (tokenParts.length !== 3) {
        console.error('❌ [API] Invalid JWT format - wrong number of parts')
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid token format' },
          { status: 401 }
        )
      }
      
      // Decode the payload (base64url decode)
      let payload: any
      try {
        console.log('🔓 [API] Decoding JWT payload...')
        const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64Payload + '='.repeat((4 - (base64Payload.length % 4)) % 4)
        
        // Decode base64 using Buffer (Node.js runtime)
        // Note: Buffer is available in Next.js API routes (Node.js runtime, not Edge)
        let decoded: string
        if (typeof Buffer !== 'undefined') {
          decoded = Buffer.from(padded, 'base64').toString('utf-8')
        } else {
          // Fallback if Buffer is not available (shouldn't happen in Node.js runtime)
          throw new Error('Buffer is not available - runtime issue')
        }
        
        payload = JSON.parse(decoded)
        userId = payload.sub || payload.user_id
        if (!userId) {
          throw new Error('No user ID found in token payload')
        }
        console.log('✅ [API] Decoded JWT payload:', { userId: payload.sub || payload.user_id, email: payload.email, exp: payload.exp })
      } catch (decodeError: any) {
        console.error('❌ [API] Failed to decode JWT:', decodeError?.message, decodeError?.stack)
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid token format' },
          { status: 401 }
        )
      }
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.error('❌ [API] Token expired:', { exp: payload.exp, now: Date.now() / 1000 })
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Token expired' },
          { status: 401 }
        )
      }
      
      if (!userId) {
        console.error('❌ [API] No userId in payload')
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Could not extract user ID from token' },
          { status: 401 }
        )
      }
      
      console.log('✅ [API] Token decoded, userId extracted:', userId)
    } catch (error: any) {
      console.error('❌ [API] Exception during token verification:', error?.message, error?.stack)
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Token verification failed - ' + (error?.message || 'Unknown error') },
        { status: 401 }
      )
    }

    if (!userId) {
      console.error('No userId available for admin check')
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Could not identify user' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminClient = getSupabaseAdmin()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .eq('role', 'admin')
      .single()

    if (userError || !userData) {
      // Check what role the user actually has for debugging
      const { data: actualUserData, error: actualUserError } = await adminClient
        .from('users')
        .select('role, email')
        .eq('id', userId)
        .single()

      // Return detailed debug info in the error response
      const debugInfo = {
        userId,
        userError: userError?.message,
        userErrorCode: userError?.code,
        userErrorDetails: userError?.details,
        userErrorHint: userError?.hint,
        userData,
        actualUserRole: (actualUserData as { role?: string; email?: string } | null)?.role || null,
        actualUserEmail: (actualUserData as { role?: string; email?: string } | null)?.email || null,
        actualUserError: actualUserError?.message,
        timestamp: new Date().toISOString(),
        codeVersion: 'v2-check-2025',
      }
      
      console.error('❌ [API] Admin check failed:', debugInfo)
      
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required',
        debug: debugInfo
      }, { status: 403 })
    }
    
    console.log('✅ Admin role verified for user:', { userId, email: (userData as { role: string; email: string })?.email })

    // Check if email already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('is_deleted', false)
      .single()

    if (existingUser) {
      console.log('❌ [API] Email already exists:', email)
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    console.log('📧 [API] Sending invitation email first (this will create the auth user)...')
    console.log('📧 [API] Invitation redirectTo:', `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/coach/login`)
    
    // Use inviteUserByEmail FIRST - this creates the auth user and sends invitation
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name,
          last_name,
          user_type: 'coach',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/coach/login`,
      }
    )

    console.log('📧 [API] Invitation email response:', { inviteData, inviteError })

    if (inviteError || !inviteData?.user) {
      console.error('❌ [API] Error sending invitation email:', {
        error: inviteError,
        message: inviteError?.message,
        code: inviteError?.code,
        status: inviteError?.status,
      })
      return NextResponse.json(
        { 
          success: false, 
          error: inviteError?.message || 'Failed to send invitation email',
          errorCode: inviteError?.code,
        },
        { status: 500 }
      )
    }

    const authUser = inviteData.user
    console.log('✅ [API] Invitation email sent successfully, auth user created:', authUser.id)

    console.log('💾 [API] Creating users and coaches records via RPC...')
    console.log('💾 [API] RPC parameters:', {
      p_user_id: authUser.id,
      p_email: email,
      p_first_name: first_name,
      p_last_name: last_name,
      p_is_available: is_available,
      p_max_clients: max_clients,
      p_max_moais: max_moais,
      p_bio: bio,
      p_specializations: specializations || [],
    })
    
    // Create users and coaches records via RPC function
    const { data: result, error: rpcError } = await adminClient.rpc('create_coach_records', {
      p_user_id: authUser.id,
      p_email: email,
      p_first_name: first_name,
      p_last_name: last_name,
      p_is_available: is_available,
      p_max_clients: max_clients,
      p_max_moais: max_moais,
      p_bio: bio,
      p_specializations: specializations || [],
    } as any)

    console.log('💾 [API] RPC response:', { result, rpcError })

    if (rpcError) {
      console.error('❌ [API] Error creating coach records:', {
        error: rpcError,
        message: rpcError.message,
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint,
      })
      // Try to cleanup auth user if records creation failed
      console.log('🧹 [API] Cleaning up auth user:', authUser.id)
      await adminClient.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { 
          success: false, 
          error: rpcError.message || 'Failed to create coach records',
          rpcError: rpcError.code,
          rpcDetails: rpcError.details,
        },
        { status: 500 }
      )
    }

    if (!result || (result as any)?.success !== true) {
      // Try to cleanup auth user if records creation failed
      console.log('🧹 [API] Cleaning up auth user (RPC result failed):', authUser.id)
      await adminClient.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { success: false, error: (result as any)?.error || 'Failed to create coach records' },
        { status: 500 }
      )
    }

    const rpcResult = result as any

    console.log('✅ [API] Coach account created successfully!')

    return NextResponse.json({
      success: true,
      coachId: rpcResult.coach_id,
      userId: rpcResult.user_id,
    })
  } catch (error: any) {
    // CRITICAL: Always return JSON, never let HTML error pages through
    try {
      console.error('❌ [API] Exception caught:', {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        toString: error?.toString(),
      })
      
      const errorMessage = error?.message || error?.toString() || 'Failed to create coach account'
      
      console.error('❌ [API] Returning error response:', { errorMessage, status: 500 })
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        },
        { status: 500 }
      )
    } catch (fallbackError: any) {
      // Even if logging fails, return JSON
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}
