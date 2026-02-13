'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachLoginPage() {
  const router = useRouter()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if we have an invitation token in the URL (redirect from email)
    // Supports both implicit flow (hash) and PKCE flow (query params)
    const hash = window.location.hash
    const hasHashToken = hash && (hash.includes('access_token') || hash.includes('token_hash') || hash.includes('type=invite'))
    const hasQueryToken = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('token_hash')
    if (hasHashToken || hasQueryToken) {
      router.replace(`/coach/setup-password${window.location.search}${hash}`)
      return
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Dynamically import to avoid SSR issues
      const { supabase } = await import('@/lib/supabase')
      const { CoachService } = await import('@/lib/services/coachService')

      // Determine if input is email or username
      const isEmail = usernameOrEmail.includes('@')
      let emailToUse = usernameOrEmail

      // If it's a username, look up the email
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', usernameOrEmail)
          .single()

        if (userError || !userData) {
          setError('Invalid username or email')
          setLoading(false)
          return
        }

        emailToUse = userData.email
      }

      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Login failed')
        setLoading(false)
        return
      }

      // Check if user is a coach
      const coachProfile = await CoachService.getCoachProfileByUserId(authData.user.id)

      if (!coachProfile) {
        await supabase.auth.signOut()
        setError('Access denied. This account is not a coach.')
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/coach')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold font-comfortaa text-[#1e3a8a]">
              moai
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Coach Portal Login
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your coach dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username-or-email" className="sr-only">
                Username or Email
              </label>
              <input
                id="username-or-email"
                name="username-or-email"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

