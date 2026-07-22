'use client'

import Link from 'next/link'
import { ArrowRight, Check, Target, UserPlus, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollReveal } from '@/components/scroll-reveal'
import { MarketingNav } from '@/components/marketing-nav'
import { MarketingFooter } from '@/components/marketing-footer'

const CHOOSE_TYPE = [
  {
    id: 'social',
    icon: Users,
    iconColor: 'text-[#2563eb] bg-blue-50 ring-blue-200/80',
    name: 'Social Moai',
    tagline: 'Bring your own people.',
    body: 'Create a Moai with friends, family, or coworkers. Everyone can work toward their own goals while checking in, sharing progress, and keeping one another accountable.',
  },
  {
    id: 'add-coach',
    icon: UserPlus,
    iconColor: 'text-violet-700 bg-violet-50 ring-violet-200/80',
    name: 'Add a Coach',
    tagline: 'Add expert guidance to your group.',
    body: 'Already have your people? Add a coach who creates an individualized training plan for each member and helps your group stay on track.',
  },
  {
    id: 'focus',
    icon: Target,
    iconColor: 'text-emerald-700 bg-emerald-50 ring-emerald-200/80',
    name: 'Focus Moai',
    tagline: 'Join people working toward the same goal.',
    body: "Join a coach-led Moai centered around a shared goal, such as building strength, improving longevity, or getting leaner. You'll receive structured programming, coaching, and support from people on a similar path.",
  },
] as const

const PRICING_TIERS = [
  {
    id: 'social',
    icon: Users,
    iconColor: 'text-[#2563eb] bg-blue-50 ring-blue-200/80',
    name: 'Social Moai',
    price: '$0',
    cadence: 'forever',
    tagline: 'You and your people, self-organized.',
    features: [
      'Start or join a group with friends or family',
      'Up to 10 people, everyone sets their own commitment',
      'No coach required',
    ],
    highlighted: false,
  },
  {
    id: 'add-coach',
    icon: UserPlus,
    iconColor: 'text-violet-700 bg-violet-50 ring-violet-200/80',
    name: 'Add a coach to your Moai',
    price: '$199',
    cadence: '/ month',
    tagline: 'Keep your own group, add real guidance.',
    features: [
      'Your friends & family Moai stays intact',
      'A coach in your group’s corner, even if everyone’s goals differ',
      'Individualized programming for each member',
    ],
    highlighted: false,
  },
  {
    id: 'focus',
    icon: Target,
    iconColor: 'text-emerald-700 bg-emerald-50 ring-emerald-200/80',
    name: 'Focus Moai',
    price: '$69',
    cadence: '/ month',
    tagline: 'No group yet? Join one led by a real coach.',
    features: [
      'Coach-designed program for the whole group',
      'Shared focus, like strength or long-term health',
      'Weekly check-ins and accountability from your coach',
    ],
    highlighted: true,
  },
] as const

const COMPARISON_ROWS = [
  {
    label: 'Cost',
    traditional: '$150–300+ per session',
    focusMoai: '$69/month per person',
    ownMoai: '$199/month per group',
  },
  {
    label: 'Coaching',
    traditional: 'Fully individualized',
    focusMoai: 'Adapted within a shared goal',
    ownMoai: 'Individualized for each member',
  },
  {
    label: 'Accountability',
    traditional: 'Mostly you and your trainer',
    focusMoai: 'Coach plus a small group',
    ownMoai: 'Your own group plus a coach',
  },
] as const

export default function ProductPage() {
  return (
    <div className="marketing-landing min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main id="main-content" className="scroll-smooth">
        {/* Page intro */}
        <section className="py-14 md:py-20 border-b border-slate-300/40">
          <div className="max-w-4xl mx-auto px-6">
            <ScrollReveal>
              <h1 className="text-4xl md:text-6xl text-slate-900 mb-4">
                Find your people. Choose your support.
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Every Moai is a small group built around showing up together. Start
                one with people you know, add a coach to your group, or join a
                coach-led Moai built around a shared goal.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Choose your type of Moai */}
        <section className="landing-section-alt py-14 md:py-20 border-b border-slate-300/40">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-5">
              {CHOOSE_TYPE.map((type, i) => {
                const Icon = type.icon
                return (
                  <ScrollReveal key={type.id} delayMs={i * 80} className="h-full block">
                    <div className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                      <span
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-full ring-2 mb-4',
                          type.iconColor
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <h2 className="text-xl font-semibold text-slate-900 mb-1">
                        {type.name}
                      </h2>
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        {type.tagline}
                      </p>
                      <p className="text-[15px] leading-relaxed text-slate-600">
                        {type.body}
                      </p>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* Understand the value + pricing */}
        <section className="py-14 md:py-20 border-b border-slate-300/40">
          <div className="max-w-5xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-2xl md:text-4xl text-slate-900 mb-4 max-w-3xl">
                Personal coaching, without the 1-on-1 price
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-3xl">
                With Moai, the cost of coaching is shared across a small group. Your
                coach still adapts your training to your goals, experience, equipment,
                and limitations&mdash;you&apos;re just not paying for every minute of
                their time alone.
              </p>
            </ScrollReveal>
            <ScrollReveal delayMs={80} className="relative mb-12">
              <div
                className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-[#e8edf5] to-transparent"
                aria-hidden
              />
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <div className="min-w-[640px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="grid grid-cols-4 border-b border-slate-200/90 bg-slate-50 text-sm font-semibold text-slate-700">
                    <div className="px-4 py-3" />
                    <div className="px-4 py-3 flex items-center gap-2">
                      <X className="w-4 h-4 text-slate-400" aria-hidden />
                      Traditional 1-on-1
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2 text-emerald-700">
                      <Check className="w-4 h-4" aria-hidden />
                      Focus Moai
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2 text-violet-700">
                      <Check className="w-4 h-4" aria-hidden />
                      Coach your own Moai
                    </div>
                  </div>
                  {COMPARISON_ROWS.map((row, i) => (
                    <div
                      key={row.label}
                      className={cn(
                        'grid grid-cols-4 text-[15px]',
                        i < COMPARISON_ROWS.length - 1 && 'border-b border-slate-100'
                      )}
                    >
                      <div className="px-4 py-4 font-medium text-slate-900">{row.label}</div>
                      <div className="px-4 py-4 text-slate-500">{row.traditional}</div>
                      <div className="px-4 py-4 text-slate-700">{row.focusMoai}</div>
                      <div className="px-4 py-4 text-slate-700">{row.ownMoai}</div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-5">
              {PRICING_TIERS.map((tier, i) => {
                const Icon = tier.icon
                return (
                  <ScrollReveal key={tier.id} delayMs={i * 80} className="h-full block">
                    <div
                      className={cn(
                        'flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm',
                        tier.highlighted
                          ? 'border-[#2563eb]/40 shadow-md ring-1 ring-[#2563eb]/20'
                          : 'border-slate-200/90'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-full ring-2 mb-4',
                          tier.iconColor
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        {tier.name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">{tier.tagline}</p>
                      <p className="mb-4">
                        <span className="text-3xl font-semibold text-slate-900">
                          {tier.price}
                        </span>
                        <span className="text-sm text-slate-500 ml-1">{tier.cadence}</span>
                      </p>
                      <ul className="space-y-2.5 text-[15px] text-slate-600 mb-6">
                        {tier.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check
                              className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                              aria-hidden
                            />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/#download"
                        className={cn(
                          'mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors',
                          tier.highlighted
                            ? 'text-white bg-[#2563eb] hover:bg-[#1d4ed8]'
                            : 'text-[#2563eb] border-2 border-[#2563eb]/35 hover:bg-blue-50'
                        )}
                      >
                        Get started
                      </Link>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
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
