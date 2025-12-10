'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function InvitePageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Extract invite code from URL
  useEffect(() => {
    // Try path parameter first: /invite/ABC123
    const codeFromPath = params?.code as string
    
    // Try query parameter: /invite?code=ABC123
    const codeFromQuery = searchParams?.get('code')
    
    const code = (codeFromPath || codeFromQuery)?.toUpperCase()
    
    if (code && code.length === 6) {
      setInviteCode(code)
      // Store for app to pick up
      if (typeof window !== 'undefined') {
        localStorage.setItem('moai_invite_code', code)
        sessionStorage.setItem('moai_invite_code', code)
      }
    }
  }, [params, searchParams])

  // Function to open app with invite code (without redirecting current page)
  const openAppWithCode = () => {
    if (!inviteCode) {
      return
    }
    
    // Store the code
    if (typeof window !== 'undefined') {
      localStorage.setItem('moai_invite_code', inviteCode)
      sessionStorage.setItem('moai_invite_code', inviteCode)
    }
    
    // Only try to open app if we're on the production domain
    // On localhost, just store the code (Universal Links won't work anyway)
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.includes('localhost'))
    
    if (!isLocalhost) {
      // Try to open app via Universal Link / App Link
      // Use a hidden iframe to trigger the link without redirecting current page
      const inviteUrl = `https://withmoai.co/invite/${inviteCode}`
      
      // Create a temporary iframe to trigger Universal Links / App Links
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.src = inviteUrl
      document.body.appendChild(iframe)
      
      // Remove iframe after a short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    } else {
      // On localhost, show user feedback
      setMessage(`Invite code ${inviteCode} has been saved! When you open the Moai app, it will automatically use this code.`)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity">
            Moai
          </Link>
          <div className="flex gap-6">
            <Link href="/terms" className="text-foreground hover:text-primary transition-colors">
              Terms of Use
            </Link>
            <Link href="/privacy" className="text-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/delete" className="text-foreground hover:text-primary transition-colors">
              Delete Account
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-foreground">You're invited to Moai</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join a social fitness platform designed to help you stay consistent through AI coaching, human support,
              and shared progress.
            </p>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-8 max-w-md mx-auto space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Invite Code</p>
              <p id="inviteCode" className="text-2xl font-mono font-bold text-foreground">
                {inviteCode || 'Loading...'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this code when you sign up or share it with friends to get exclusive benefits.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={openAppWithCode}
              disabled={!inviteCode}
              className="w-full max-w-md bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign Up with This Invite
            </button>
            
            {/* User feedback message */}
            {message && (
              <div className="max-w-md mx-auto p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            )}
            
            {/* Download buttons as fallback */}
            <div className="flex flex-col gap-3 max-w-md mx-auto mt-4">
              <a
                href="https://apps.apple.com/us/app/moai/id6749557946"
                className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                <span className="mr-2">📱</span>
                Download on the App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
                className="flex items-center justify-center px-6 py-3 bg-[#3ddc84] text-black rounded-lg font-semibold hover:bg-[#2fc770] transition-colors"
              >
                <span className="mr-2">🤖</span>
                Get it on Google Play
              </a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/" className="text-primary hover:underline">
                Go home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  )
}
