'use client'
import Link from 'next/link'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { CitizenDashboard } from '@/components/dashboard/CitizenDashboard'
import { useLocation } from '@/components/providers/LocationProvider'
export default function OfficerPage() {
  const { selectionQuery } = useLocation()
  return <RoleGuard role="officer"><div className="mx-auto flex max-w-[1800px] flex-wrap gap-3 px-3 pt-3 text-sm"><Link className="flex min-h-11 items-center rounded border bg-card px-3" href={`/alerts?${selectionQuery}`}>Review local alerts</Link><Link className="flex min-h-11 items-center rounded border bg-card px-3" href={`/occupational?${selectionQuery}`}>Review occupational exposure</Link><a className="flex min-h-11 items-center rounded border bg-card px-3" href="#nearby-help">Review mapped resources</a></div><CitizenDashboard officer /></RoleGuard>
}
