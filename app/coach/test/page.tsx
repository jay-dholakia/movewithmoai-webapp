'use client'

import { useEffect, useState } from 'react'

export default function TestPage() {
  const [status, setStatus] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Dynamically import to avoid SSR issues
      const { supabase } = await import('@/lib/supabase')
      
      setStatus('Testing Supabase connection...')
      
      // Test 1: Check if Supabase client is initialized
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      setStatus('✓ Supabase client initialized')

      // Test 2: Check auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`)
      }
      setStatus(`✓ Auth check passed (${session ? 'logged in' : 'not logged in'})`)

      // Test 3: Test querying a simple table
      const { data: coaches, error: coachesError } = await supabase
        .from('coaches')
        .select('id, name, email')
        .limit(1)

      if (coachesError) {
        throw new Error(`Coaches query error: ${coachesError.message}`)
      }
      setStatus(`✓ Can query coaches table (found ${coaches?.length || 0} coaches)`)

      // Test 4: Test querying the view
      const { data: metrics, error: metricsError } = await supabase
        .from('coach_client_metrics')
        .select('user_id, email')
        .limit(1)

      if (metricsError) {
        throw new Error(`Metrics view error: ${metricsError.message}`)
      }
      setStatus(`✓ Can query coach_client_metrics view (found ${metrics?.length || 0} rows)`)

      setStatus('✅ All tests passed!')
    } catch (err: any) {
      console.error('Test error:', err)
      setError(err.message || 'Unknown error')
      setStatus('❌ Test failed')
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Coach Portal Test Page</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Coach Portal Test Page</h1>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Status:</p>
            <p className="text-gray-700">{status}</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="font-medium text-red-800">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
          <div className="mt-6">
            <a href="/coach/login" className="text-blue-600 hover:underline">
              Go to Login Page →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

