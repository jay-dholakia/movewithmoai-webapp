import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Manifesto | Moai',
  description:
    'Intention fades without support. Moai is a small group and a coach so fitness intentions are harder to lose.',
}

export default function ManifestoPage() {
  return (
    <div className="marketing-landing min-h-screen flex flex-col">
      <a href="#manifesto-content" className="sr-only">
        Skip to manifesto
      </a>

      <header>
        <nav
          className="sticky top-0 z-40 border-b border-slate-300/50 bg-[#e8edf5]/95 backdrop-blur-md shadow-sm"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
            <div className="flex items-center">
              <Link
                href="/"
                className="marketing-site-logo hover:opacity-90 transition-opacity lowercase text-[#2563eb] text-2xl"
                aria-label="Moai home"
              >
                moai
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-[13px] sm:text-sm tracking-wide">
              <span
                className="text-[#2563eb] font-semibold px-1 py-1"
                aria-current="page"
              >
                Manifesto
              </span>
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

      <main
        id="manifesto-content"
        className="flex-1 landing-manifesto-sheen border-b border-slate-300/40"
      >
        <article className="max-w-2xl mx-auto px-6 py-16 md:py-28">
          <h1 className="marketing-manifesto-title text-4xl md:text-6xl text-slate-900 mb-16 md:mb-24">
            Manifesto
          </h1>
          <div className="marketing-manifesto-body">
            <div className="marketing-manifesto-stanza space-y-6">
              <p>We all intend to do things.</p>
              <p>
                To follow through.
                <br />
                To be consistent.
                <br />
                To show up in the ways we say we will.
              </p>
              <p>And for a while, we do.</p>
            </div>

            <div className="marketing-manifesto-stanza space-y-6">
              <p>
                Then something shifts. A busy week. Low energy. Life gets in the way. And slowly,
                the intention fades.
              </p>
              <p>
                Not because we don&apos;t care—
                <br />
                because intention, on its own, is easy to lose.
              </p>
              <p>
                When you&apos;re on your own, it&apos;s easy to let yourself off the hook.
                <br />
                Push it to tomorrow. No one notices.
              </p>
              <p>
                For a long time, that&apos;s been the default.
                <br />
                Figure it out yourself. Stay disciplined.
              </p>
              <p>And sometimes that works—until it doesn&apos;t.</p>
            </div>

            <p className="marketing-manifesto-pull">Moai is built for that gap.</p>

            <div className="marketing-manifesto-stanza space-y-6">
              <p>A small group of people doing it with you.</p>
              <p>
                Each person showing up with their own intention—
                <br />
                and helping hold everyone else to theirs.
              </p>
              <p>
                A coach to guide the way—
                <br />
                so you&apos;re not just consistent, but moving in the right direction.
              </p>
            </div>

            <div className="marketing-manifesto-stanza space-y-6">
              <p>Because something changes when it&apos;s not just you anymore.</p>
              <p>
                You notice when others show up.
                <br />
                They notice when you do.
              </p>
              <p>
                And when someone starts to drift, they don&apos;t fall off alone—they get pulled back
                in.
              </p>
            </div>

            <p className="marketing-manifesto-pull">That&apos;s the difference.</p>

            <div className="marketing-manifesto-stanza space-y-6">
              <p>
                Not pressure.
                <br />
                Not perfection.
              </p>
              <p>Just enough around you to keep going.</p>
              <p>
                Because saying what you&apos;ll do is easy.
                <br />
                Doing it—over time—is what changes things.
              </p>
              <p>
                You build momentum.
                <br />
                You start to trust yourself again.
              </p>
            </div>

            <div className="marketing-manifesto-stanza space-y-6">
              <p>Health and fitness is one of the clearest places this breaks down.</p>
              <p>
                It&apos;s easy to start.
                <br />
                Easy to stop.
                <br />
                Easy to feel like you&apos;re doing it alone.
              </p>
            </div>

            <p className="marketing-manifesto-pull">So we start there.</p>

            <div className="marketing-manifesto-stanza space-y-6 !mb-0">
              <p>
                Take something you already intend to do—
                <br />
                and put it in a group where it&apos;s harder to lose.
              </p>
              <p>
                Because it&apos;s easier to stick with something when you&apos;re not doing it alone.
              </p>
            </div>
          </div>

          <p className="mt-16 md:mt-20 text-center">
            <Link
              href="/#download"
              className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-10 py-3.5 text-[15px] font-semibold tracking-wide text-white hover:bg-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#e8edf5]"
            >
              Get the app
            </Link>
          </p>
        </article>
      </main>

      <footer className="bg-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <Link
                href="/"
                className="marketing-site-logo text-2xl lowercase text-white hover:text-slate-200"
              >
                moai
              </Link>
              <p className="text-sm text-slate-400 mt-2">
                &copy; {new Date().getFullYear()} Moai. All rights reserved.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300 tracking-wide">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/_withmoai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
