'use client'

import {
  Building2,
  Droplets,
  Home,
  Hospital,
  Snowflake,
  type LucideIcon,
} from 'lucide-react'

import {
  FACILITY_FRESH_DAYS,
  FACILITY_LABELS,
  FACILITY_STALE_DAYS,
} from '@/lib/constants'
import type { Facility, FacilityType } from '@/lib/types'
import { cn, daysSince } from '@/lib/utils'

const ICONS: Record<FacilityType, LucideIcon> = {
  cooling_centre: Snowflake,
  hospital: Hospital,
  phc: Building2,
  water_point: Droplets,
  shelter: Home,
}

type Freshness = 'fresh' | 'aging' | 'stale'

/**
 * A cooling centre that was last confirmed open eight months ago is not a
 * cooling centre — it is a rumour. Freshness is shown on every row so nobody
 * dispatches a person on stale information.
 */
function freshnessOf(lastVerified: string | null): {
  state: Freshness
  label: string
  className: string
} {
  const age = daysSince(lastVerified)

  if (age === null) {
    return {
      state: 'stale',
      label: 'Never verified',
      className: 'text-[var(--risk-4)]',
    }
  }
  if (age <= FACILITY_FRESH_DAYS) {
    return {
      state: 'fresh',
      label: age <= 1 ? 'Verified today' : `Verified ${age} days ago`,
      className: 'text-[var(--risk-1)]',
    }
  }
  if (age <= FACILITY_STALE_DAYS) {
    return {
      state: 'aging',
      label: `Verified ${age} days ago`,
      className: 'text-[var(--risk-3)]',
    }
  }
  return {
    state: 'stale',
    label: `Last verified ${age} days ago`,
    className: 'text-[var(--risk-4)]',
  }
}

export interface FacilitiesTabProps {
  facilities: Facility[]
  isLoading?: boolean
  isError?: boolean
  className?: string
}

export function FacilitiesTab({
  facilities,
  isLoading = false,
  isError = false,
  className,
}: FacilitiesTabProps) {
  if (isLoading) {
    return <p className="text-xs tapas-subtext">Loading facilities…</p>
  }

  if (isError) {
    return (
      <p className="text-xs text-[var(--risk-4)]">
        Facility list unavailable. Fall back to the printed ward register.
      </p>
    )
  }

  if (facilities.length === 0) {
    return (
      <p className="text-xs tapas-subtext">
        No cooling centres or health facilities are registered for this ward.
      </p>
    )
  }

  const sorted = [...facilities].sort((a, b) => a.distance_km - b.distance_km)

  return (
    <ul className={cn('space-y-2', className)} data-testid="facilities-list">
      {sorted.map((facility) => {
        const Icon = ICONS[facility.type] ?? Building2
        const freshness = freshnessOf(facility.last_verified)
        const stale = freshness.state === 'stale'

        return (
          <li
            key={facility.id}
            className={cn(
              'flex gap-2.5 rounded-md border border-border p-2.5',
              stale && 'bg-slate-50',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                stale ? 'text-slate-400' : 'text-foreground',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-sm font-medium',
                  stale && 'text-slate-500',
                )}
              >
                {facility.name}
              </p>
              <p className="text-[11px] tapas-subtext">
                {FACILITY_LABELS[facility.type] ?? facility.type} ·{' '}
                {facility.distance_km.toFixed(1)} km
                {facility.capacity ? ` · capacity ${facility.capacity}` : ''}
              </p>
              <p className={cn('text-[11px] font-medium', freshness.className)}>
                {freshness.label}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
