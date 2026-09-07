import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RiskLevel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** YYYY-MM-DD in local time — the format every TAPAS endpoint expects. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

/** The dates the dashboard can show, starting today. */
export function forecastDates(days = 5, from = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => toIsoDate(addDays(from, i)))
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** "Today", then "Tue", "Wed"... */
export function dayLabel(iso: string, index: number): string {
  if (index === 0) return 'Today'
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { weekday: 'short' })
}

export function longDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function shortDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatClock(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

/** Whole days elapsed since an ISO date, or null if unparseable/absent. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86_400_000)
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

/** Coerce anything the backend sends into a valid level rather than crashing. */
export function clampRiskLevel(value: unknown): RiskLevel {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return 1
  return Math.min(5, Math.max(1, n)) as RiskLevel
}

export function formatTemp(
  value: number | undefined | null,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }
  return `${Number(value).toFixed(digits)}°C`
}

/** "05:00" from an hour index. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * Deterministic 32-bit hash. Used to give each ward a stable pseudo-random
 * offset in the demo data so the map is not uniformly coloured.
 */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}
