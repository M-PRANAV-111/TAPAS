'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Thermometer } from 'lucide-react'

import { useDemoMode } from '@/hooks/useRiskMap'
import { APP_NAME, PILOT_AUTHORITY, PILOT_CITY } from '@/lib/constants'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/occupational', label: 'Occupational' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const pathname = usePathname()
  const demo = useDemoMode()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white no-print">
      <nav
        className="mx-auto flex h-14 max-w-[1800px] items-center gap-4 px-3 sm:px-4"
        aria-label="Main"
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: 'var(--risk-4)' }}
          >
            <Thermometer className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight">
              {APP_NAME}
            </span>
            <span className="hidden text-[11px] tapas-subtext sm:block">
              {PILOT_AUTHORITY} · {PILOT_CITY} pilot
            </span>
          </span>
        </Link>

        <ul className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href)
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'tapas-subtext hover:bg-secondary/60',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {demo ? (
          <span
            data-testid="demo-badge"
            title="The forecast API is unreachable. Figures shown are bundled sample data, not a live forecast."
            className="hidden shrink-0 rounded-full border border-[var(--risk-3)] px-2 py-0.5 text-[11px] font-semibold text-[var(--risk-3)] sm:inline-block"
          >
            Demo data
          </span>
        ) : null}
      </nav>
    </header>
  )
}
