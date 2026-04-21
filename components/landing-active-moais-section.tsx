'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn } from '@/lib/utils'

type MemberAvatar = { imageUrl: string | null; initial: string }

type ActiveMoaiItem = {
  id: string
  kind: 'focus' | 'social'
  memberCount: number
  maxMembers: number | null
  theme: string | null
  moaiName: string | null
  withCoach: boolean | null
  description: string | null
  coachName: string | null
  coachImageUrl: string | null
  memberAvatars: MemberAvatar[]
  /** Social: total completed workouts across members; shown only when count is above 50 */
  moaiCompletedWorkouts?: number
}

type ApiResponse = {
  success: boolean
  items: ActiveMoaiItem[]
  unavailable?: boolean
}

function SocialMemberAvatars({ members }: { members: MemberAvatar[] }) {
  if (members.length === 0) return null
  return (
    <div
      className="mt-3 flex items-center"
      aria-label={`${members.length} active member${members.length === 1 ? '' : 's'}`}
    >
      {members.map((m, i) => (
        <div
          key={i}
          className={cn(
            'relative h-9 w-9 shrink-0 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm',
            i > 0 && '-ml-2.5'
          )}
          style={{ zIndex: members.length - i }}
        >
          {m.imageUrl ? (
            <img
              src={m.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-600">
              {m.initial}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function MoaiMarqueeCard({ item }: { item: ActiveMoaiItem }) {
  const isFocus = item.kind === 'focus'
  const members = item.memberAvatars ?? []

  const title =
    item.moaiName?.trim() ||
    (isFocus ? item.theme || 'Focus Moai' : 'Social Moai')

  const coachInitial =
    item.coachName?.replace(/^Coach\s+/i, '').trim().charAt(0).toUpperCase() ||
    '·'

  return (
    <div
      className={cn(
        'relative shrink-0 w-max min-w-[240px] max-w-[min(92vw,440px)] rounded-xl border px-3 py-3 shadow-sm bg-white/95 backdrop-blur-sm self-start',
        isFocus
          ? 'border-violet-200/80 pr-[4.75rem]'
          : 'border-slate-200/90'
      )}
    >
      {isFocus ? (
        <div className="absolute top-2.5 right-2.5 flex w-[3.75rem] flex-col items-center gap-1 text-center">
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-violet-200/90 bg-violet-50 ring-1 ring-white"
            aria-hidden={!item.coachImageUrl}
          >
            {item.coachImageUrl ? (
              <img
                src={item.coachImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-violet-700">
                {coachInitial}
              </span>
            )}
          </div>
          {item.coachName ? (
            <p className="w-full text-[10px] font-medium leading-tight text-slate-600 break-words">
              {item.coachName}
            </p>
          ) : (
            <p className="w-full text-[10px] leading-tight text-slate-400">Coach</p>
          )}
        </div>
      ) : null}

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {isFocus ? 'Focus' : 'Social'}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 leading-snug pr-1 break-words">
        {title}
      </p>
      {isFocus && item.theme && item.moaiName && item.theme !== item.moaiName ? (
        <p className="mt-1 text-[11px] text-slate-500">{item.theme}</p>
      ) : null}
      {isFocus && item.description ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
          {item.description}
        </p>
      ) : null}
      {!isFocus ? <SocialMemberAvatars members={members} /> : null}
      {!isFocus &&
      item.moaiCompletedWorkouts != null &&
      item.moaiCompletedWorkouts > 50 ? (
        <p className="mt-2 text-xs font-medium text-emerald-800">
          {item.moaiCompletedWorkouts.toLocaleString()} workouts completed
        </p>
      ) : null}
    </div>
  )
}

const RESUME_AUTO_MS = 2600
const AUTO_PAN_PX_PER_FRAME = 0.48

function ActiveMoaisAutoPanStrip({ stripItems }: { stripItems: ActiveMoaiItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const userControlRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProgrammaticScrollRef = useRef(false)
  const dragRef = useRef<{ startX: number; startScroll: number; pointerId: number } | null>(
    null
  )

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current != null) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const scheduleResumeAuto = useCallback(() => {
    clearResumeTimer()
    resumeTimerRef.current = setTimeout(() => {
      userControlRef.current = false
      resumeTimerRef.current = null
    }, RESUME_AUTO_MS)
  }, [clearResumeTimer])

  const takeUserControl = useCallback(() => {
    userControlRef.current = true
    clearResumeTimer()
  }, [clearResumeTimer])

  const releaseUserControlSoon = useCallback(() => {
    scheduleResumeAuto()
  }, [scheduleResumeAuto])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let raf = 0
    const tick = () => {
      if (!userControlRef.current && el.scrollWidth > el.clientWidth + 2) {
        const half = el.scrollWidth / 2
        if (half > 2) {
          isProgrammaticScrollRef.current = true
          el.scrollLeft += AUTO_PAN_PX_PER_FRAME
          if (el.scrollLeft >= half - 0.5) {
            el.scrollLeft -= half
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stripItems.length])

  const onScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false
      return
    }
    takeUserControl()
    scheduleResumeAuto()
  }, [takeUserControl, scheduleResumeAuto])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return
      const el = scrollRef.current
      if (!el) return
      takeUserControl()
      dragRef.current = {
        startX: e.clientX,
        startScroll: el.scrollLeft,
        pointerId: e.pointerId,
      }
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    [takeUserControl]
  )

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const el = scrollRef.current
    if (!drag || !el || e.pointerId !== drag.pointerId) return
    isProgrammaticScrollRef.current = true
    el.scrollLeft = drag.startScroll - (e.clientX - drag.startX)
  }, [])

  const onPointerUpLike = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current
      if (dragRef.current && e.pointerId === dragRef.current.pointerId) {
        dragRef.current = null
        try {
          el?.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        releaseUserControlSoon()
      }
    },
    [releaseUserControlSoon]
  )

  const onWheel = useCallback(() => {
    takeUserControl()
    scheduleResumeAuto()
  }, [takeUserControl, scheduleResumeAuto])

  useEffect(() => {
    return () => clearResumeTimer()
  }, [clearResumeTimer])

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label="Active Moai groups on the app"
      tabIndex={0}
      className="landing-moai-strip-hide-scrollbar overflow-x-auto overflow-y-hidden py-1 cursor-grab active:cursor-grabbing touch-pan-x outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0f4fa] rounded-md"
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUpLike}
      onPointerCancel={onPointerUpLike}
      onLostPointerCapture={() => {
        if (dragRef.current) {
          dragRef.current = null
          releaseUserControlSoon()
        }
      }}
      onWheel={onWheel}
    >
      <div className="flex gap-3 px-6 w-max items-start">
        {stripItems.map((item, i) => (
          <MoaiMarqueeCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export function LandingActiveMoaisSection() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/public/active-moais', { cache: 'no-store' })
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
  const hasRows = items.length > 0
  const loop = reduceMotion ? items : [...items, ...items]

  return (
    <section
      id="active-moais"
      className="landing-section-alt border-b border-slate-300/40 py-16 md:py-24"
      aria-labelledby="active-moais-heading"
    >
      <div className="max-w-5xl mx-auto px-6">
        <h2
          id="active-moais-heading"
          className="text-2xl md:text-4xl text-slate-900 mb-3"
        >
          Moais happening now
        </h2>
        <p className="text-base md:text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
          Small groups. Real commitments. Showing up each week.
        </p>

        {loadError || data?.unavailable ? (
          <p className="text-sm text-slate-500 mb-6">
            Live groups will load here when the app is connected to our servers.
          </p>
        ) : !data ? (
          <div className="h-5 w-48 rounded bg-slate-200/80 animate-pulse mb-6" aria-hidden />
        ) : null}

        {hasRows ? (
          <div className="relative -mx-6 md:mx-0">
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 md:w-16 z-10 bg-gradient-to-r from-white to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 md:w-16 z-10 bg-gradient-to-l from-white to-transparent"
              aria-hidden
            />

            {reduceMotion ? (
              <div
                className="flex flex-wrap justify-center items-start gap-x-3 gap-y-4 px-6 py-1"
                aria-label="Active Moai groups on the app"
              >
                {loop.map((item, i) => (
                  <MoaiMarqueeCard key={`${item.id}-${i}`} item={item} />
                ))}
              </div>
            ) : (
              <ActiveMoaisAutoPanStrip stripItems={loop} />
            )}
          </div>
        ) : null}

        {data && !loadError && !hasRows && !data.unavailable ? (
          <p className="text-center text-sm text-slate-600 max-w-md mx-auto py-6 border border-dashed border-slate-200 rounded-xl bg-white/60 px-4">
            Groups are forming every day. Download the app to start or join a Moai.
          </p>
        ) : null}
      </div>
    </section>
  )
}
