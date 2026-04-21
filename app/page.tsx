'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Users,
  Sparkles,
  ChevronDown,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LandingActiveMoaisSection } from '@/components/landing-active-moais-section'

const NODE_COLORS = [
  'bg-[#2563eb]',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-violet-500',
  'bg-cyan-500',
] as const

const STEP_STYLES = [
  'bg-blue-50 text-blue-800 ring-2 ring-blue-200/80',
  'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200/80',
  'bg-orange-50 text-orange-900 ring-2 ring-orange-200/80',
  'bg-cyan-50 text-cyan-900 ring-2 ring-cyan-200/80',
  'bg-violet-50 text-violet-800 ring-2 ring-violet-200/80',
] as const

const LANDING_FAQ_ITEMS: { id: string; q: string; paragraphs: string[] }[] = [
  {
    id: 'cost',
    q: 'Does it cost anything?',
    paragraphs: [
      'Creating a Moai with friends or family is free, forever. If you want more structure, you can join a coach-led Focus Moai or add a coach to your group for a monthly subscription.',
    ],
  },
  {
    id: 'different',
    q: 'What makes this different from other fitness apps?',
    paragraphs: [
      'Most apps track what you do.',
      'Moai helps you actually stick with it—by putting you in a small group that notices when you show up.',
    ],
  },
  {
    id: 'invite',
    q: 'Do I need to invite people I know?',
    paragraphs: [
      'No. You can start a Moai with friends, or join a Focus Moai and have a crew to show up with.',
    ],
  },
  {
    id: 'focus-moai',
    q: 'What is a Focus Moai?',
    paragraphs: [
      'A Focus Moai is a coach-led group designed for more structure. You follow a shared plan, get feedback from a coach, and stay accountable alongside your group.',
    ],
  },
  {
    id: 'size',
    q: 'How big is a Moai?',
    paragraphs: [
      'Moais are small by design—up to 10 people. Big enough to feel like a team, small enough that your consistency actually registers.',
    ],
  },
  {
    id: 'miss-week',
    q: 'What happens if I miss a week?',
    paragraphs: [
      'Nothing breaks. Your group will notice, and you can pick right back up. The goal isn&apos;t perfection—it&apos;s staying in it over time.',
    ],
  },
  {
    id: 'gym',
    q: 'Do I need a gym?',
    paragraphs: [
      'No. You can follow your plan anywhere—gym, home, outdoors. Moai is about consistency, not location.',
    ],
  },
  {
    id: 'coaches-real',
    q: 'Are the coaches real?',
    paragraphs: [
      'Yes. Our coaches are certified and experienced in helping people build consistent, sustainable routines. They&apos;re there to guide, not overwhelm.',
    ],
  },
  {
    id: 'data',
    q: 'What do you do with my data?',
    paragraphs: [
      'We only use your data to give you, your Moai, and your coach better insight into your progress. We don&apos;t sell your data.',
    ],
  },
]

function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '0px 0px -48px 0px', threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'reveal-on-scroll',
        visible && 'reveal-on-scroll-visible',
        className
      )}
      style={{ ['--reveal-delay' as string]: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Download and sign up',
    bodyLines: [
      'Create your account and set what showing up means for you.',
      'Connect a wearable if you use one so your progress is tracked automatically.',
    ],
  },
  {
    step: '2',
    title: 'Create or join a Moai',
    bodyLines: [
      'Start a Moai with friends or join a coach-led Focus Moai for more structure.',
      "Either way, you're in a small group working toward a shared goal—whether that's weight loss, muscle gain, or long-term health.",
    ],
  },
  {
    step: '3',
    title: 'Set a workout commitment',
    bodyLines: [
      'This curates a coach-designed routine based on your focus, equipment availability, and training experience.',
    ],
  },
  {
    step: '4',
    title: 'Train and check in',
    bodyLines: [
      'Log workouts, share progress, and be honest when things get off track.',
      'Your group sees it all—wins and misses.',
    ],
  },
  {
    step: '5',
    title: 'Celebrate wins together',
    bodyLines: [
      'Progress is shared.',
      'You cheer each other on, build momentum, and stay in it as a group.',
    ],
  },
] as const

function StaggeredHowItWorksCards() {
  const listRef = useRef<HTMLOListElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    let intervalId: number | undefined

    const runStagger = () => {
      if (started.current) return
      started.current = true
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        setVisibleCount(HOW_IT_WORKS_STEPS.length)
        return
      }
      setVisibleCount(1)
      let tick = 1
      intervalId = window.setInterval(() => {
        tick += 1
        if (tick <= HOW_IT_WORKS_STEPS.length) {
          setVisibleCount(tick)
        }
        if (tick >= HOW_IT_WORKS_STEPS.length && intervalId) {
          window.clearInterval(intervalId)
        }
      }, 240)
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          runStagger()
          obs.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [])

  return (
    <ol ref={listRef} className="flex w-full flex-col gap-4 list-none m-0 p-0">
      {HOW_IT_WORKS_STEPS.map((item, i) => (
        <li
          key={item.step}
          className={cn(
            'h-full rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300',
            'reveal-on-scroll',
            i < visibleCount && 'reveal-on-scroll-visible'
          )}
        >
          <span
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold tabular-nums text-sm mb-3',
              STEP_STYLES[i % STEP_STYLES.length]
            )}
          >
            {item.step}
          </span>
          <h3 className="text-base font-semibold text-slate-900 mb-1.5">{item.title}</h3>
          <div className="text-[15px] leading-relaxed text-slate-600 space-y-2.5">
            {item.bodyLines.map((line, j) => (
              <p key={`${item.step}-${j}`}>{line}</p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

function HomeContent() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('type=invite'))) {
      router.replace(`/coach/setup-password${hash}`)
    }
  }, [router])

  return (
    <div className="marketing-landing min-h-screen overflow-x-hidden">
      <a href="#main-content" className="sr-only">
        Skip to main content
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
                aria-label="Moai home"
                className="marketing-site-logo hover:opacity-90 transition-opacity lowercase text-[#2563eb] text-2xl"
              >
                moai
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-[13px] sm:text-sm tracking-wide">
              <Link
                href="/origin"
                className="text-slate-800 hover:text-[#2563eb] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 rounded-md px-1 py-1"
              >
                Origin
              </Link>
              <Link
                href="#download"
                className="text-slate-800 hover:text-[#2563eb] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 rounded-md px-1 py-1"
              >
                Download
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" className="scroll-smooth">
        {/* Hero */}
        <section
          className="relative py-20 md:py-28 overflow-hidden border-b border-slate-300/40"
          aria-labelledby="hero-heading"
        >
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

          <div className="max-w-4xl mx-auto px-6 relative">
            <div className="flex gap-2 mb-8" aria-hidden>
              {NODE_COLORS.map((c, i) => (
                <span
                  key={i}
                  className={cn('landing-node h-2.5 w-2.5 rounded-full', c)}
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
              ))}
            </div>
            <ScrollReveal>
              <div className="space-y-7">
                <h1
                  id="hero-heading"
                  className="text-5xl sm:text-5xl md:text-6xl lg:text-8xl text-slate-900 max-w-[20ch]"
                >
                  Make consistency a{' '}
                  <span className="whitespace-nowrap">shared ritual</span>
                </h1>
                <p className="marketing-hero-lede max-w-2xl mt-2">
                  Small groups where showing up actually counts.
                  <br />
                  Support from your crew, guidance from a real coach.
                  <br />
                  A system you can actually stick with, and evolves with you.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-2">
                  <a
                    href="#download"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#e8edf5]"
                  >
                    Get started
                    <ArrowRight className="w-5 h-5" aria-hidden />
                  </a>
                  <Link
                    href="/origin"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-medium text-[#2563eb] border-2 border-[#2563eb]/35 bg-white/60 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#e8edf5]"
                  >
                    Read Origin
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* What's a Moai */}
        <section
          id="what-is-moai"
          className="landing-section-alt border-b border-slate-300/40 py-20 md:py-28"
          aria-labelledby="what-is-moai-heading"
        >
          <div className="max-w-4xl mx-auto px-6">
            <ScrollReveal>
              <h2
                id="what-is-moai-heading"
                className="text-3xl md:text-5xl text-slate-900 mb-6"
              >
                What&apos;s a Moai?
              </h2>
              <div className="text-lg text-slate-600 mb-10 max-w-3xl">
                <p className="text-slate-700">
                  A Moai is a small group built around staying consistent, together.
                </p>
              </div>
            </ScrollReveal>
            <ul className="grid sm:grid-cols-2 gap-4 text-slate-700">
              <li className="min-h-0">
                <ScrollReveal delayMs={40} className="h-full block">
                  <div className="flex h-full gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                    <Users className="w-5 h-5 text-[#2563eb] shrink-0 mt-1" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">Small on purpose</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        Moais can be up to 10 people committing to their goals. Big enough to feel
                        like a team, small enough that your consistency actually registers.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              </li>
              <li className="min-h-0">
                <ScrollReveal delayMs={100} className="h-full block">
                  <div className="flex h-full gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                    <HeartPulse className="w-5 h-5 text-emerald-600 shrink-0 mt-1" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">Support over scoreboards</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        Mutual commitment goes further than individual leaderboards.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              </li>
              <li className="min-h-0 sm:col-span-2">
                <ScrollReveal delayMs={160} className="h-full block">
                  <div className="flex h-full gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                    <Sparkles className="w-5 h-5 text-violet-600 shrink-0 mt-1" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">Coaches in the mix</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        Guidance on form, recovery, and habits—so you&apos;re not guessing your way
                        through it.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              </li>
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="py-20 md:py-28 border-b border-slate-300/40"
          aria-labelledby="how-heading"
        >
          <div className="max-w-5xl mx-auto px-6">
            <ScrollReveal>
              <h2
                id="how-heading"
                className="text-3xl md:text-5xl text-slate-900 mb-8"
              >
                How it works
              </h2>
            </ScrollReveal>
            <StaggeredHowItWorksCards />
          </div>
        </section>

        <LandingActiveMoaisSection />

        {/* FAQ */}
        <section
          id="faq"
          className="landing-section-alt py-20 md:py-24 border-b border-slate-300/40"
          aria-labelledby="faq-heading"
        >
          <div className="max-w-3xl mx-auto px-6">
            <ScrollReveal>
              <h2
                id="faq-heading"
                className="text-3xl md:text-4xl text-slate-900 mb-8"
              >
                FAQ&apos;s:
              </h2>
            </ScrollReveal>
            <div className="space-y-3">
              {LANDING_FAQ_ITEMS.map((item, i) => (
                <ScrollReveal key={item.id} delayMs={i * 45}>
                  <details className="group rounded-xl border border-slate-200/90 bg-white shadow-sm open:shadow-md transition-shadow">
                    <summary className="cursor-pointer list-none px-5 py-4 font-medium text-slate-900 flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown
                        className="w-5 h-5 text-[#2563eb] shrink-0 opacity-90 group-open:rotate-180 transition-transform duration-200"
                        aria-hidden
                      />
                    </summary>
                    <div className="px-5 pb-4 pt-0 text-slate-600 leading-relaxed space-y-3">
                      {item.paragraphs.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                    </div>
                  </details>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Download */}
        <section
          id="download"
          className="max-w-4xl mx-auto px-6 py-20 md:py-28"
          aria-labelledby="download-heading"
        >
          <ScrollReveal>
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 md:p-10 shadow-md space-y-8">
              <h2
                id="download-heading"
                className="text-4xl md:text-6xl text-slate-900"
              >
                Get started today
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Live your best life, together -- with Moai.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href="https://apps.apple.com/us/app/moai/id6749557946"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:ring-offset-white"
                  aria-label="Download Moai on the App Store"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-8 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white"
                  aria-label="Get Moai on Google Play"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

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
                      href="/origin"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Origin
                    </Link>
                  </li>
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
    </div>
  )
}

export default function Home() {
  return <HomeContent />
}
