'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ArrowRight, LogOut } from 'lucide-react'
import { useDemoRole, signOutDemo } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/occupational', label: 'Occupational' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const role = useDemoRole()
  const { selectionQuery } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Landing page hero handles its own clean role cards
  if (pathname === '/') return null

  const isOfficerOrAuthority = role === 'officer' || role === 'authority'
  const userDisplayName =
    role === 'officer'
      ? 'S. Kumar · Mandal Officer'
      : role === 'authority'
      ? 'Dr. A. Sharma · District Authority'
      : null

  const handleSignOut = () => {
    signOutDemo()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-soft)] bg-[var(--surface-0)]/95 backdrop-blur-md no-print">
      <nav aria-label="Main" className="mx-auto flex max-w-[1800px] items-center justify-between gap-x-4 px-4 py-2.5 sm:px-6">
        {/* Left: Wordmark linking to / (primary escape hatch) */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
            title="Return to TAPAS Home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--surface-0)] font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              T
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-extrabold tracking-wider text-[var(--ink-high)]">
                TAPAS
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-[var(--ink-low)] sm:inline">
                Heat Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <li key={link.href}>
                  <Link
                    href={`${link.href}?${selectionQuery}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-8 items-center rounded-md px-3 text-xs font-medium tracking-wide transition-colors',
                      active
                        ? 'bg-[var(--surface-2)] text-[var(--ink-high)] border border-[var(--line-soft)] font-semibold'
                        : 'text-[var(--ink-mid)] hover:bg-[var(--surface-1)] hover:text-[var(--ink-high)]'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Right side controls: Live status + Auth state */}
        <div className="flex items-center gap-3">
          {/* Live Status Pill */}
          <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--ink-low)] tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
            <span className="text-[var(--ink-high)]">● LIVE</span>
          </div>

          {/* Authenticated User vs Public Sign In */}
          {isOfficerOrAuthority ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs font-medium text-[var(--ink-mid)] border-r border-[var(--line-hair)] pr-3 font-variant-numeric tabular-nums">
                {userDisplayName}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--line-soft)] bg-transparent px-3 text-xs font-medium text-[var(--ink-mid)] hover:border-[var(--accent)] hover:text-[var(--ink-high)] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-[var(--ink-low)]" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              href={`/login?role=officer`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--line-soft)] bg-transparent px-3 py-1 text-xs font-medium text-[var(--ink-mid)] hover:border-[var(--accent)] hover:text-[var(--ink-high)] transition-colors shadow-sm"
            >
              <span>Officer sign in</span>
              <ArrowRight className="h-3 w-3 text-[var(--ink-low)]" />
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--ink-mid)] md:hidden hover:text-[var(--ink-high)] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile navigation collapse sheet */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--line-hair)] bg-[var(--surface-1)] p-4 md:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <li key={link.href}>
                  <Link
                    href={`${link.href}?${selectionQuery}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex min-h-10 items-center rounded-md px-3 text-xs font-medium transition-colors',
                      active
                        ? 'bg-[var(--surface-2)] text-[var(--ink-high)] font-semibold border-l-2 border-[var(--accent)]'
                        : 'text-[var(--ink-mid)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-high)]'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {userDisplayName && (
            <div className="mt-3 pt-3 border-t border-[var(--line-hair)] text-xs text-[var(--ink-low)]">
              Logged in as <span className="text-[var(--ink-high)] font-medium">{userDisplayName}</span>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
