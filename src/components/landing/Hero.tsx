'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Landmark, ShieldCheck, UserRound } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { fetchTickerReadings } from '@/lib/landing'
import type { HeatPoint } from '@/lib/heatGrid'
import { cn } from '@/lib/utils'

const CYCLE_MS = 4000

function HeroTicker() {
  const [points, setPoints] = useState<HeatPoint[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchTickerReadings(controller.signal)
      .then((result) => (result.length ? setPoints(result) : setFailed(true)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setFailed(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!points || points.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % points.length), CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [points])

  if (failed) return <p className="text-sm text-white/50">Live city conditions are unavailable right now.</p>
  if (!points) return <p className="text-sm text-white/40">Loading live conditions…</p>

  const point = points[index]
  return (
    <p key={point.id} className="tapas-ticker-fade text-sm text-white/75 sm:text-base">
      Right now:{' '}
      <strong className="font-semibold text-white">
        {point.temperature !== null ? `${Math.round(point.temperature)}°C` : 'Unavailable'}
      </strong>{' '}
      in {point.name}
    </p>
  )
}

const ROLE_CARDS = [
  {
    icon: UserRound,
    title: 'CITIZEN',
    description: 'Check your heat risk and find help nearby',
    cta: 'Open Dashboard',
    href: '/dashboard',
  },
  {
    icon: ShieldCheck,
    title: 'MANDAL OFFICER',
    description: 'Monitor & respond locally',
    cta: 'Officer Login',
    href: '/login',
  },
  {
    icon: Landmark,
    title: 'HIGHER AUTHORITY',
    description: 'Regional heat command',
    cta: 'Authority Login',
    href: '/login',
  },
] as const

export function Hero() {
  const { selectionQuery } = useLocation()
  return (
    <section className="relative isolate overflow-hidden bg-[#12181f] px-3 py-16 text-white sm:px-4 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tapas-blob tapas-blob-1" />
        <div className="tapas-blob tapas-blob-2" />
        <div className="tapas-blob tapas-blob-3" />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">TAPAS</h1>
        <p className="mt-3 max-w-xl text-base text-white/70 sm:text-lg">
          India&rsquo;s Heat Risk Intelligence &amp; Response Platform
        </p>
        <div className="mt-6 min-h-6">
          <HeroTicker />
        </div>

        <div className="mt-10 grid w-full gap-3 sm:grid-cols-3">
          {ROLE_CARDS.map(({ icon: Icon, title, description, cta, href }) => (
            <Link
              key={title}
              href={`${href}?${selectionQuery}`}
              className={cn(
                'group flex min-h-11 flex-col items-start gap-2 rounded-lg border border-white/15 bg-white/5 p-4 text-left',
                'transition-all duration-150 hover:-translate-y-1 hover:border-[var(--risk-3)]',
              )}
            >
              <Icon className="h-5 w-5 text-white/70" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-widest text-white/90">{title}</span>
              <span className="text-sm text-white/60">{description}</span>
              <span className="mt-1 text-sm font-medium text-[var(--risk-3)] group-hover:underline">
                {cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
