'use client'

import { useEffect, useState } from 'react'
import { ScrollReveal } from '@/components/scroll-reveal'

type CoachItem = {
  id: string
  name: string
  imageUrl: string | null
  bio: string | null
  specializations: string[]
}

type ApiResponse = {
  success: boolean
  items: CoachItem[]
  allSpecializations: string[]
  unavailable?: boolean
}

function CoachCard({ coach }: { coach: CoachItem }) {
  const initial = coach.name.charAt(0).toUpperCase() || '·'
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-violet-200/90 bg-violet-50 ring-1 ring-white"
          aria-hidden={!coach.imageUrl}
        >
          {coach.imageUrl ? (
            <img src={coach.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-violet-700">
              {initial}
            </span>
          )}
        </div>
        <p className="font-semibold text-slate-900">Coach {coach.name}</p>
      </div>
      {coach.bio ? (
        <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-3">{coach.bio}</p>
      ) : null}
      {coach.specializations.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {coach.specializations.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200/80"
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function LandingCoachesSection() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/public/coaches', { cache: 'no-store' })
        const json = (await res.json()) as ApiResponse
        if (!cancelled && json.success) setData(json)
        else if (!cancelled) setLoadError(true)
      } catch {
        if (!cancelled) setLoadError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const items = data?.items ?? []
  const specializations = data?.allSpecializations ?? []
  const hasCoaches = items.length > 0

  return (
    <div className="max-w-5xl mx-auto px-6">
      {specializations.length > 0 ? (
        <ScrollReveal className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Our coaches specialize in
          </p>
          <div className="flex flex-wrap gap-2">
            {specializations.map((s) => (
              <span
                key={s}
                className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </ScrollReveal>
      ) : null}

      {loadError || data?.unavailable ? (
        <p className="text-sm text-slate-500">
          Coach profiles will load here when the app is connected to our servers.
        </p>
      ) : !data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : hasCoaches ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((coach, i) => (
            <ScrollReveal key={coach.id} delayMs={(i % 3) * 60} className="h-full block">
              <CoachCard coach={coach} />
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-slate-600 max-w-md mx-auto py-6 border border-dashed border-slate-200 rounded-xl bg-white/60 px-4">
          New coaches are joining Moai every week. Check back soon to meet the team.
        </p>
      )}
    </div>
  )
}
