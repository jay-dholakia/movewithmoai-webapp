'use client'

import { HeartPulse, Sparkles } from 'lucide-react'
import { ScrollReveal } from '@/components/scroll-reveal'
import { FeaturePhoto } from '@/components/feature-photo'
import { MarketingNav } from '@/components/marketing-nav'
import { MarketingFooter } from '@/components/marketing-footer'
import { LandingCoachesSection } from '@/components/landing-coaches-section'

export default function CoachesPage() {
  return (
    <div className="marketing-landing min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main id="main-content" className="scroll-smooth">
        {/* Page intro */}
        <section className="py-14 md:py-20 border-b border-slate-300/40">
          <div className="max-w-4xl mx-auto px-6">
            <ScrollReveal>
              <h1 className="text-4xl md:text-6xl text-slate-900 mb-4">
                Real people, not scripts
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Here to guide your training, not just watch it happen.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* The difference: support + coaches feature rows */}
        <section
          id="the-difference"
          className="landing-section-alt py-14 md:py-20 border-b border-slate-300/40"
          aria-labelledby="the-difference-heading"
        >
          <div className="max-w-5xl mx-auto px-6">
            <ScrollReveal>
              <h2 id="the-difference-heading" className="sr-only">
                The difference
              </h2>
            </ScrollReveal>
            <div className="space-y-12 md:space-y-16">
              <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
                <ScrollReveal className="order-2 md:order-1">
                  <FeaturePhoto
                    src="/images/landing/community-huddle.webp"
                    alt="Two Moai members laughing together in a huddle after a workout"
                    aspect="aspect-[4/3]"
                  />
                </ScrollReveal>
                <ScrollReveal delayMs={80} className="order-1 md:order-2">
                  <HeartPulse className="w-6 h-6 text-emerald-600 mb-4" aria-hidden />
                  <h3 className="text-2xl md:text-4xl text-slate-900 mb-4">
                    Support over scoreboards
                  </h3>
                  <p className="text-[15px] md:text-base leading-relaxed text-slate-600">
                    Your Moai notices when you show up&mdash;and when you don&apos;t. That mutual
                    commitment goes further than any leaderboard, because it&apos;s people, not
                    points, holding you to it.
                  </p>
                </ScrollReveal>
              </div>

              <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
                <ScrollReveal>
                  <Sparkles className="w-6 h-6 text-violet-600 mb-4" aria-hidden />
                  <h3 className="text-2xl md:text-4xl text-slate-900 mb-4">
                    Coaches in the mix
                  </h3>
                  <p className="text-[15px] md:text-base leading-relaxed text-slate-600">
                    Real, certified coaches design your plan around your equipment,
                    experience, and goals&mdash;then guide your form, recovery, and habits so
                    you&apos;re never guessing your way through it.
                  </p>
                </ScrollReveal>
                <ScrollReveal delayMs={80}>
                  <FeaturePhoto
                    src="/images/landing/community-training.webp"
                    alt="A line of people training together with kettlebells, guided by a coach"
                    aspect="aspect-[4/3]"
                  />
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the coaches */}
        <section
          id="meet-the-coaches"
          className="py-14 md:py-20 border-b border-slate-300/40"
          aria-labelledby="coaches-heading"
        >
          <div className="max-w-5xl mx-auto px-6 mb-6">
            <ScrollReveal>
              <h2 id="coaches-heading" className="text-3xl md:text-5xl text-slate-900 mb-4">
                Meet the coaches
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl">
                Certified, experienced, and available for a Focus Moai or your own group.
              </p>
            </ScrollReveal>
          </div>
          <LandingCoachesSection />
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
