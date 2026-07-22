'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollReveal } from '@/components/scroll-reveal'
import { MarketingNav } from '@/components/marketing-nav'
import { MarketingFooter } from '@/components/marketing-footer'

const STEP_STYLES = [
  'bg-blue-50 text-blue-800 ring-2 ring-blue-200/80',
  'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200/80',
  'bg-orange-50 text-orange-900 ring-2 ring-orange-200/80',
  'bg-cyan-50 text-cyan-900 ring-2 ring-cyan-200/80',
  'bg-violet-50 text-violet-800 ring-2 ring-violet-200/80',
] as const

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
      "This curates a coach-designed routine based on your focus, equipment availability, and training experience. Send a quick form-check video anytime you want feedback on how you're moving.",
    ],
  },
  {
    step: '4',
    title: 'Train and check in',
    bodyLines: [
      "Log workouts, share progress, and be honest when things get off track. Message your coach directly in the app, and watch your streak build—both yours and your Moai's.",
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
    <ol ref={listRef} className="flex w-full flex-col gap-3 list-none m-0 p-0">
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

export default function HowItWorksPage() {
  return (
    <div className="marketing-landing min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main id="main-content" className="scroll-smooth">
        {/* Page intro */}
        <section
          className="py-14 md:py-20 border-b border-slate-300/40"
          aria-labelledby="how-hero-heading"
        >
          <div className="max-w-4xl mx-auto px-6">
            <ScrollReveal>
              <h1
                id="how-hero-heading"
                className="text-4xl md:text-6xl text-slate-900 mb-4"
              >
                How it works
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Five steps to get started, from download to your first celebration.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* How it works steps */}
        <section
          id="how-it-works"
          className="landing-section-alt py-14 md:py-20 border-b border-slate-300/40"
          aria-labelledby="how-heading"
        >
          <div className="max-w-5xl mx-auto px-6">
            <ScrollReveal>
              <h2
                id="how-heading"
                className="text-2xl md:text-4xl text-slate-900 mb-6"
              >
                Getting started
              </h2>
            </ScrollReveal>
            <StaggeredHowItWorksCards />
          </div>
        </section>

        {/* Why it works: the psychology of shared commitment */}
        <section
          id="why-it-works"
          className="landing-manifesto-sheen border-b border-slate-300/40 py-14 md:py-20"
          aria-labelledby="why-heading"
        >
          <div className="max-w-2xl mx-auto px-6">
            <ScrollReveal>
              <h2
                id="why-heading"
                className="text-3xl md:text-5xl text-slate-900 mb-6"
              >
                Why I built Moai
              </h2>
              <div className="marketing-manifesto-body">
                <p>Hi, I&apos;m Jay.</p>
                <p>
                  About 15 years ago, when I left home for college, I decided to take
                  better care of my health. It took a few years, but I eventually lost
                  around 80 pounds.
                </p>
                <p>
                  There was no extreme diet or perfect plan. I found routines that
                  worked for me and kept coming back to them, week after week.
                </p>
                <p>
                  But getting there was harder and lonelier than it needed to be. I
                  needed guidance to know I was moving in the right direction,
                  accountability to keep going when motivation faded, and people in my
                  corner when things did not go according to plan.
                </p>
                <p>
                  A personal trainer can provide that, but paying hundreds or even
                  thousands of dollars every month is not realistic for most people.
                  And even with a trainer, health can still feel like something you
                  are trying to manage alone.
                </p>
                <p className="marketing-manifesto-pull">
                  Moai was built around a different idea: share the support of a
                  coach across a small group, make it more affordable, and make the
                  experience more social and enjoyable.
                </p>
                <p>
                  You get a plan shaped around you, a coach helping you move forward,
                  and a group that notices when you show up and supports you when you
                  struggle.
                </p>
                <p className="marketing-manifesto-pull">
                  Because lasting change is easier when you have the right guidance,
                  real accountability, and people beside you.
                </p>
                <p className="mt-2 text-slate-700">
                  Jay
                  <br />
                  Founder
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 py-14 md:py-20 text-center">
          <ScrollReveal>
            <Link
              href="/#download"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#e8edf5]"
            >
              Get started
              <ArrowRight className="w-5 h-5" aria-hidden />
            </Link>
          </ScrollReveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
