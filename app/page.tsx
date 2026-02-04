'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { ArrowRight } from "lucide-react"

function HomeContent() {
  const router = useRouter()

  useEffect(() => {
    // Check if we have an invitation token in the URL hash (from Supabase email)
    // If so, redirect to password setup page
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('type=invite'))) {
      router.replace(`/coach/setup-password${hash}`)
      return
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <header>
        <nav
          className="sticky top-0 bg-background/98 backdrop-blur-md border-b border-border z-40 shadow-crisp"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold">
              <Link 
                href="/" 
                aria-label="Moai home" 
                className="hover:opacity-80 transition-opacity font-comfortaa lowercase"
                style={{ color: '#2563eb' }}
              >
                moai
              </Link>
            </div>
            <div className="flex gap-6 items-center" role="list">
              <Link
                href="#download"
                className="text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Download
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="scroll-smooth">
        {/* Hero Section */}
        <section
          className="relative py-24 md:py-32"
          aria-labelledby="hero-heading"
        >
          {/* Content container */}
          <div className="max-w-4xl mx-auto px-6">
            <div className="space-y-8">
              <h1
                id="hero-heading"
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight font-display"
              >
                Make Consistency a Shared Ritual
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-3xl font-light">
                Join small accountability groups where your commitment matters. With peer support and expert guidance, build a routine that sticks — together.
              </p>
              <div className="pt-4">
                <a
                  href="#download"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="max-w-4xl mx-auto px-6 py-20 md:py-32"
          aria-labelledby="features-heading"
        >
          <div className="space-y-16">
            <article>
              <h3 className="text-3xl font-semibold text-foreground mb-4 font-heading">
                Peer Support
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Join small accountability groups where your consistency matters. When you show up, your group notices. When you don't, they're there to help you get back on track. This isn't about competition — it's about mutual support and shared commitment.
              </p>
            </article>

            <article>
              <h3 className="text-3xl font-semibold text-foreground mb-4 font-heading">
                Expert Guidance
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Access certified fitness coaches who design programs tailored to your needs. Get personalized feedback on form, recovery strategies, and ongoing support to help you build sustainable habits and avoid injury.
              </p>
            </article>

            <article>
              <h3 className="text-3xl font-semibold text-foreground mb-4 font-heading">
                Shared Progress
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Track your progress alongside your group. Your achievements become collective wins, and your consistency inspires others. When progress is shared, accountability becomes natural and motivation becomes sustainable.
              </p>
            </article>
          </div>
        </section>

        {/* CTA / Download Section */}
        <section
          id="download"
          className="max-w-4xl mx-auto px-6 py-20 md:py-32"
          aria-labelledby="download-heading"
        >
          <div className="space-y-8">
            <h2
              id="download-heading"
              className="text-4xl md:text-5xl font-bold text-foreground font-heading"
            >
              Get Started Today
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Download the app and start building your accountability group. Find your people, set your commitments, and create the consistency you've been looking for.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 pt-4">
            <a
              href="https://apps.apple.com/us/app/moai/id6749557946"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-8 py-4 bg-black text-white rounded-lg hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              aria-label="Download Moai on the App Store"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-8 py-4 bg-[#3ddc84] text-black rounded-lg hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-[#3ddc84] focus:ring-offset-2"
              aria-label="Get Moai on Google Play"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
            </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo and Copyright */}
            <div className="md:col-span-1">
              <div className="text-2xl font-bold mb-4">
                <span className="font-comfortaa lowercase" style={{ color: '#ffffff' }}>
                moai
              </span>
              </div>
              <p className="text-sm text-slate-400">
                &copy; {new Date().getFullYear()} Moai. All rights reserved.
              </p>
            </div>

            {/* Navigation Links - Left Column */}
            <div>
            <nav aria-label="Footer navigation">
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="#download"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Download
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Navigation Links - Right Column */}
            <div>
              <nav aria-label="Footer legal navigation">
                <ul className="space-y-3">
                  <li>
                <Link
                  href="/terms"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                      Terms of Service
                </Link>
                  </li>
                  <li>
                <Link
                  href="/privacy"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/_withmoai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-white transition-colors text-sm inline-flex items-center gap-2"
                      aria-label="Follow us on Instagram"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 512 512"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z" />
                        <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z" />
                      </svg>
                      Instagram
                    </a>
                  </li>
                </ul>
              </nav>
              </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-400 max-w-4xl">
              Moai provides fitness guidance and workout programs. Always consult with a healthcare provider before starting any new fitness program, especially if you have pre-existing health conditions or injuries.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return <HomeContent />
}
