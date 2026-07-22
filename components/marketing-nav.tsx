'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/product', label: 'Product' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/faq', label: 'FAQ' },
] as const

export function MarketingNav() {
  const pathname = usePathname()

  return (
    <header>
      <nav
        className="sticky top-0 z-40 border-b border-slate-300/50 bg-[#e8edf5]/95 backdrop-blur-md shadow-sm"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
          <div className="flex items-center">
            <Link
              href="/"
              aria-label="Moai home"
              className="marketing-site-logo hover:opacity-90 transition-opacity lowercase text-[#2563eb] text-2xl"
            >
              moai
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-[13px] sm:text-sm tracking-wide">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 rounded-md px-1 py-1',
                    active
                      ? 'text-[#2563eb] font-semibold'
                      : 'text-slate-800 hover:text-[#2563eb]'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/#download"
              className="text-slate-800 hover:text-[#2563eb] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 rounded-md px-1 py-1"
            >
              Download
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
