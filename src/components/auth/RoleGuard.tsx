'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOutDemo, useDemoRole, type DemoRole } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
export function RoleGuard({ role, children }: { role: DemoRole; children: ReactNode }) {
  const current = useDemoRole(), router = useRouter(), { selectionQuery } = useLocation()
  useEffect(() => { if (current !== undefined && current !== role) router.replace(`/login?${selectionQuery}`) }, [current, role, router, selectionQuery])
  if (current !== role) return <p role="status" className="p-6">Opening prototype sign-in…</p>
  return <><div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-xs"><p>SIH demo session · {role === 'officer' ? 'Mandal Officer' : 'Higher Authority'} · Frontend only; no secure access control.</p><div className="flex flex-wrap gap-4"><Link className="flex min-h-11 items-center underline" href={`/login?${selectionQuery}`}>Switch demo role</Link><button className="min-h-11 underline" onClick={() => { signOutDemo(); router.replace(`/login?${selectionQuery}`) }}>Log out</button></div></div>{children}</>
}
