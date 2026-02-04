import type { Metadata } from "next"
import Link from "next/link"
import PrivacyPolicyContent from "@/components/privacy-policy-content"
import TableOfContents from "@/components/table-of-contents"

export const metadata: Metadata = {
  title: "Privacy Policy | Moai",
  description:
    "Learn how Moai protects your data and privacy. Our complete privacy policy for the social fitness platform.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
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
                href="/#download"
                className="text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Download
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Page Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last Updated: November 2024</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <TableOfContents />
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <PrivacyPolicyContent />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-20">
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
                      href="/#download"
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
