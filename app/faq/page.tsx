'use client'

import { ChevronDown } from 'lucide-react'
import { ScrollReveal } from '@/components/scroll-reveal'
import { MarketingNav } from '@/components/marketing-nav'
import { MarketingFooter } from '@/components/marketing-footer'

const LANDING_FAQ_ITEMS: { id: string; q: string; paragraphs: string[] }[] = [
  {
    id: 'different',
    q: 'What makes this different from other fitness apps?',
    paragraphs: [
      "Most apps just track what you do. Moai puts you in a small group that actually notices when you show up, so you're more likely to keep doing it.",
    ],
  },
  {
    id: 'cost',
    q: 'Does it cost anything?',
    paragraphs: [
      'Creating a Moai with friends or family is free, forever. If you want more structure, you can join a coach-led Focus Moai for $69/month, or add a coach to your own Moai for $199/month.',
    ],
  },
  {
    id: 'focus-moai',
    q: 'What is a Focus Moai?',
    paragraphs: [
      'A Focus Moai is a coach-led group anyone can join, built around one specific focus—like strength or long-term health. Everyone in the group shares that focus, so your coach builds one shared program for the whole group.',
      'Adding a coach to your own friends & family Moai is different. Everyone can be working toward their own goals with their own plan, while a coach guides the group along the way.',
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
    id: 'size',
    q: 'How big is a Moai?',
    paragraphs: [
      "Moais top out at 10 people. That's enough to feel like a real team, and small enough that people actually notice if you're missing.",
    ],
  },
  {
    id: 'miss-week',
    q: 'What happens if I miss a week?',
    paragraphs: [
      "Nothing breaks. Your group will notice, and you can pick right back up. It's less about a perfect streak and more about staying in it over time.",
    ],
  },
  {
    id: 'gym',
    q: 'Do I need a gym?',
    paragraphs: [
      'No. Follow your plan at a gym, at home, or outdoors. What matters is showing up, not where you do it.',
    ],
  },
  {
    id: 'coaches-real',
    q: 'Are the coaches real?',
    paragraphs: [
      'Yes. Our coaches are certified and experienced, and they focus on practical guidance you can actually follow.',
    ],
  },
  {
    id: 'choose-coach',
    q: 'Can I choose my coach?',
    paragraphs: [
      'Yes. Browse available coaches and their focus areas, and pick the one who fits you best.',
    ],
  },
  {
    id: 'message-coach',
    q: 'Can I message my coach directly?',
    paragraphs: [
      "Yes. You can message your coach in the app anytime, and send a form-check video whenever you want feedback on how you're moving.",
    ],
  },
  {
    id: 'data',
    q: 'What do you do with my data?',
    paragraphs: [
      "We only use your data to give you, your Moai, and your coach better insight into your progress. We don't sell your data.",
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="marketing-landing min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main id="main-content" className="scroll-smooth">
        <section className="py-14 md:py-20">
          <div className="max-w-3xl mx-auto px-6">
            <ScrollReveal>
              <h1 className="text-4xl md:text-6xl text-slate-900 mb-8">FAQ&apos;s:</h1>
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
      </main>

      <MarketingFooter />
    </div>
  )
}
