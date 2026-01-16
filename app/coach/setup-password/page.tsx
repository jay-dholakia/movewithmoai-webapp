'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SetupPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if we have the token in the URL hash (Supabase sends it as a hash fragment)
    const hash = window.location.hash
    if (!hash && !searchParams.get('token')) {
      setError('Invalid or missing invitation link. Please check your email.')
    }
  }, [searchParams])

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Extract token from URL hash or query params
      const hash = window.location.hash
      let token: string | null = null
      
      if (hash) {
        // Supabase sends token in hash like: #access_token=xxx&type=invite
        const params = new URLSearchParams(hash.substring(1))
        token = params.get('access_token') || params.get('token')
      } else {
        token = searchParams.get('token')
      }

      if (!token) {
        setError('Invalid invitation link. Please check your email for the correct link.')
        setLoading(false)
        return
      }

      // Set the session using the token
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // Will be provided by Supabase if needed
      })

      if (sessionError || !sessionData.session) {
        // Try alternative method: verify the token first
        // The invitation link should have already verified the user
        // We just need to update the password
        const { data: userData } = await supabase.auth.getUser()
        
        if (!userData.user) {
          setError('Invalid or expired invitation link. Please request a new invitation.')
          setLoading(false)
          return
        }

        // Update password directly
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        })

        if (updateError) {
          setError(updateError.message || 'Failed to set password. The invitation link may have expired.')
          setLoading(false)
          return
        }
      } else {
        // Session was set successfully, now update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        })

        if (updateError) {
          setError(updateError.message || 'Failed to set password')
          setLoading(false)
          return
        }
      }

      setSuccess(true)
      // Redirect to coach dashboard after a short delay
      setTimeout(() => {
        router.push('/coach')
      }, 2000)
    } catch (err: any) {
      console.error('Password setup error:', err)
      setError(err.message || 'An error occurred while setting up your password')
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 border border-green-200 p-6">
            <h2 className="text-2xl font-semibold text-green-800 mb-2">Password Set Successfully!</h2>
            <p className="text-green-700">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold font-comfortaa text-[#1e3a8a]">
              moai
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Set Your Password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Please create a password for your coach account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handlePasswordSetup}>
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
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? 'Setting up password...' : 'Set Password'}
            </button>
          </div>
          
          <div className="text-center">
            <Link href="/coach/login" className="text-sm text-[#1e3a8a] hover:text-[#1e40af]">
              Already have a password? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  )
}
