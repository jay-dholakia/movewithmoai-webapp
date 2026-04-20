import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Origin | Moai',
  description:
    'Why Moai exists: consistency, follow-through, and small groups where your commitment is visible—so you keep showing up, together.',
}

export default function OriginPage() {
  return (
    <div className="marketing-landing min-h-screen flex flex-col">
      <a href="#origin-content" className="sr-only">
        Skip to Origin
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
                Origin
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
        id="origin-content"
        className="flex-1 landing-manifesto-sheen border-b border-slate-300/40"
      >
        <article className="max-w-2xl mx-auto px-6 py-16 md:py-28">
          <h1 className="marketing-manifesto-title text-4xl md:text-6xl text-slate-900 mb-16 md:mb-24">
            Origin
          </h1>
          <div className="marketing-manifesto-body">
            <p>Hi — I&apos;m Jay, founder of Moai.</p>
            <p>
              I built Moai to help people stay consistent with their health and
              fitness.
            </p>
            <p>
              About 15 years ago, I started my own journey when I left home for
              college. Over a few years, I lost around 80 pounds. It wasn&apos;t
              anything extreme—no crash diets or unsustainable routines. I built
              simple habits into my day-to-day life and, more importantly, stayed
              with them.
            </p>
            <p>
              Looking back, what made the difference wasn&apos;t any specific
              workout or diet. It was having something to come back to. I logged
              my workouts. I paid attention to what I was eating. Over time, those
              small actions became consistent.
            </p>
            <p className="marketing-manifesto-pull">
              That consistency changed everything.
            </p>
            <p>
              Years later, I see the same pattern play out around me—and
              I&apos;ve felt it myself at times. People want to get in shape. They
              start strong. They try a program, work with a trainer, or commit to
              something new. And for a while, it works.
            </p>
            <p>
              But most of these tools are designed to be used on your own.
            </p>
            <p>
              So when life gets busy—or motivation dips—there&apos;s nothing
              there to catch you. The routine fades. Progress stalls. And
              eventually, it&apos;s hard to stay with it.
            </p>
            <p>It&apos;s not a knowledge problem. Most people already know what to do.</p>
            <p className="marketing-manifesto-pull">
              It&apos;s a follow-through problem.
            </p>
            <p>And follow-through is hard to sustain alone.</p>
            <p>So I built Moai around that.</p>
            <p>
              At its core, it&apos;s a small group—up to 10 people—each committing
              to a number of days they&apos;ll show up each week. It might be
              friends, family, or people you meet through the app.
            </p>
            <p>What makes it different is that the commitment isn&apos;t private.</p>
            <p>
              You say what you&apos;re going to do, and other people see whether
              you follow through.
            </p>
            <p className="marketing-manifesto-pull">That changes behavior.</p>
            <p>
              You notice when others show up.
              <br />
              They notice when you do.
            </p>
            <p>
              And when you start to slip, you don&apos;t quietly fall off—you get
              pulled back in.
            </p>
            <p>
              There&apos;s still structure—a routine that fits your life, and
              guidance from a coach when you need it—but the difference is
              you&apos;re not doing it alone.
            </p>
            <p className="marketing-manifesto-pull">
              Moai is about saying what you&apos;ll do—
              <br />
              and actually doing it, together.
            </p>
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
