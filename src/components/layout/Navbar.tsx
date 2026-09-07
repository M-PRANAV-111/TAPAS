'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Thermometer } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { cn } from '@/lib/utils'
const LINKS = [{href:'/dashboard',label:'Dashboard'},{href:'/occupational',label:'Occupational'},{href:'/alerts',label:'Alerts'},{href:'/about',label:'About'},{href:'/login',label:'Demo roles'}]
export function Navbar() {
  const pathname = usePathname(), {selectionQuery} = useLocation()
  return <header className="sticky top-0 z-40 border-b border-border bg-white no-print"><nav aria-label="Main" className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-3 px-3 py-1 sm:px-4"><Link href={`/dashboard?${selectionQuery}`} className="flex min-h-11 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary"><Thermometer className="h-4 w-4 text-white" aria-hidden="true" /></span><span className="text-sm font-bold">TAPAS</span></Link><ul className="ml-auto flex flex-wrap items-center gap-0.5">{LINKS.map(link => <li key={link.href}><Link href={`${link.href}?${selectionQuery}`} aria-current={pathname === link.href ? 'page' : undefined} className={cn('flex min-h-11 items-center rounded-md px-2 text-xs font-medium sm:text-sm', pathname === link.href ? 'bg-secondary text-foreground' : 'tapas-subtext hover:bg-secondary/60')}>{link.label}</Link></li>)}</ul></nav></header>
}
