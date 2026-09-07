'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DEMO_ACCOUNTS, signInDemo } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import { Button } from '@/components/ui/button'
export default function LoginPage() {
  const router = useRouter(), { selectionQuery } = useLocation(), [error, setError] = useState('')
  return <div className="mx-auto max-w-3xl space-y-6 px-3 py-8"><header><p className="text-xs font-semibold uppercase tracking-widest text-primary">TAPAS · SIH prototype</p><h1 className="mt-2 text-2xl font-semibold">Choose your experience</h1><p className="mt-2 text-sm tapas-subtext">Explore public heat information or preview the two decision-support roles.</p></header><div className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Citizen</h2><p className="my-2 text-sm tapas-subtext">Local conditions, precautions and mapped help. No account needed.</p><Button asChild><Link href={`/dashboard?${selectionQuery}`}>Continue as citizen</Link></Button></div><div className="grid gap-4 sm:grid-cols-2">{DEMO_ACCOUNTS.map(account => <section key={account.id} className="min-w-0 rounded-lg border bg-white p-5"><h2 className="font-semibold">{account.name}</h2><p className="my-3 text-sm tapas-subtext">{account.role === 'officer' ? 'Local conditions, resources, alerts and occupational guidance.' : 'Regional weather map, sampled hotspot comparison and local drill-down.'}</p><Button className="min-h-11 w-full whitespace-normal" onClick={() => { try { signInDemo(account.role); router.push(`${account.route}?${selectionQuery}`) } catch { setError('Browser storage is unavailable. Enable storage to use a demo session; citizen access remains open.') } }}>Use Demo Account · {account.name}</Button></section>)}</div>{error ? <p role="alert" className="text-sm">{error}</p> : null}<p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">These are public demonstration accounts stored in this browser. This is not secure authentication. Production requires server-side sign-in and authorization.</p></div>
}
