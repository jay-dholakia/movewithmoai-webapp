import Link from 'next/link'

export function MarketingFooter() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            <div className="text-2xl font-bold mb-4">
              <span className="marketing-site-logo lowercase text-white">moai</span>
            </div>
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Moai. All rights reserved.
            </p>
          </div>
          <div>
            <nav aria-label="Footer navigation">
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/product"
                    className="text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    Product
                  </Link>
                </li>
                <li>
                  <Link
                    href="/coaches"
                    className="text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    Coaches
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-slate-300 hover:text-white transition-colors text-sm"
                  >
                    FAQ
                  </Link>
                </li>
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
        <div className="pt-8 border-t border-slate-800">
          <p className="text-xs text-slate-400 max-w-4xl">
            Moai provides fitness guidance and workout programs. Always consult with a healthcare
            provider before starting any new fitness program, especially if you have pre-existing
            health conditions or injuries.
          </p>
        </div>
      </div>
    </footer>
  )
}
