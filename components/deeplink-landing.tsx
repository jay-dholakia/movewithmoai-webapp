"use client"

import type { RefObject } from "react"
import Link from "next/link"

const NODE_COLORS = [
  "bg-[#2563eb]",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-cyan-500",
] as const

export function DeepLinkLanding({
  title,
  description,
  openAppRef,
  iosLinkRef,
  androidLinkRef,
}: {
  title: string
  description: string
  openAppRef: RefObject<HTMLAnchorElement | null>
  iosLinkRef: RefObject<HTMLAnchorElement | null>
  androidLinkRef: RefObject<HTMLAnchorElement | null>
}) {
  return (
    <div className="min-h-screen bg-[#e8edf5]">
      <nav className="sticky top-0 z-40 border-b border-slate-300/50 bg-[#e8edf5]/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <Link
            href="/"
            aria-label="Moai home"
            className="marketing-site-logo hover:opacity-90 transition-opacity lowercase text-[#2563eb] text-2xl"
          >
            moai
          </Link>
        </div>
      </nav>

      <main className="relative overflow-hidden py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 hero-animated-bg opacity-[0.18] -z-10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute hero-blob hero-blob-1 opacity-35 -z-10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute hero-blob hero-blob-2 opacity-30 -z-10 mix-blend-multiply"
          aria-hidden
        />

        <div className="max-w-md mx-auto px-6">
          <div className="flex gap-2 mb-8 justify-center" aria-hidden>
            {NODE_COLORS.map((c, i) => (
              <span
                key={i}
                className={`landing-node h-2.5 w-2.5 rounded-full ${c}`}
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </div>

          <div className="text-center mb-8 space-y-3">
            <h1 className="text-4xl md:text-5xl text-slate-900">{title}</h1>
            <p className="text-slate-600 leading-relaxed">{description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-md p-6 md:p-8 space-y-4">
            <a
              ref={openAppRef}
              href="#"
              className="flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
            >
              Open in app
            </a>
            <a
              ref={iosLinkRef}
              href="#"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              aria-label="Download Moai on the App Store"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Download on the App Store
            </a>
            <a
              ref={androidLinkRef}
              href="#"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label="Get Moai on Google Play"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Get it on Google Play
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
