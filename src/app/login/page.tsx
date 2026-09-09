'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Thermometer } from 'lucide-react'
import { DEMO_ACCOUNTS, signInDemo } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const { selectionQuery } = useLocation()
  const [error, setError] = useState('')

  return (
    <div className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#12181f] px-3 py-10 text-white sm:px-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tapas-blob tapas-blob-1" />
        <div className="tapas-blob tapas-blob-2" />
      </div>

      <div className="relative mx-auto max-w-md space-y-6">
        <header className="text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
            <Thermometer className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl font-bold tracking-tight">TAPAS</h1>
          <p className="mt-1 text-sm text-white/60">Extreme Heat Intelligence &mdash; Officer Access</p>
        </header>

        <form className="space-y-3 rounded-lg border border-white/15 bg-white/5 p-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="login-email" className="text-xs font-medium text-white/70">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="officer@example.gov.in"
              className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--risk-4)]"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-xs font-medium text-white/70">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--risk-4)]"
            />
          </div>
          <Button type="submit" variant="destructive" className="min-h-11 w-full" disabled>
            Sign in
          </Button>
          <p className="text-center text-[11px] text-white/40">
            Not wired up &mdash; real sign-in needs the Session 2 backend. Use a demo account below.
          </p>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              className="min-h-11 rounded-lg border border-white/15 bg-white/5 p-4 text-left transition-colors hover:border-[var(--risk-3)]"
              onClick={() => {
                try {
                  signInDemo(account.role)
                  router.push(`${account.route}?${selectionQuery}`)
                } catch {
                  setError('Browser storage is unavailable. Enable storage to use a demo session; citizen access remains open.')
                }
              }}
            >
              <p className="text-sm font-semibold">{account.name}</p>
              <p className="mt-1 text-xs text-white/60">
                {account.role === 'officer'
                  ? 'Local conditions, resources, alerts and occupational guidance.'
                  : 'Regional weather map, sampled hotspot comparison and local drill-down.'}
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--risk-3)]">Use Demo Account →</p>
            </button>
          ))}
        </div>

        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}

        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
          These are public demonstration accounts stored in this browser. This is not secure authentication.
          Production requires server-side sign-in and authorization.
        </p>

        <div className="text-center">
          <Link
            href={`/dashboard?${selectionQuery}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4"
          >
            Public Heat Advisory →
          </Link>
        </div>
      </div>
    </div>
  )
}
