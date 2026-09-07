'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { FORECAST_DAYS } from '@/lib/constants'

const WARD_STALE_MS = 30 * 60 * 1000
const WARD_GC_MS = 24 * 60 * 60 * 1000

export function useWardForecast(wardId: string | null) {
  return useQuery({
    queryKey: ['ward-forecast', wardId],
    queryFn: () => api.wardForecast(wardId as string),
    enabled: Boolean(wardId),
    staleTime: WARD_STALE_MS,
    gcTime: WARD_GC_MS,
  })
}

export function useWardRisk(wardId: string | null, days = FORECAST_DAYS) {
  return useQuery({
    queryKey: ['ward-risk', wardId, days],
    queryFn: () => api.wardRisk(wardId as string, days),
    enabled: Boolean(wardId),
    staleTime: WARD_STALE_MS,
    gcTime: WARD_GC_MS,
  })
}

export function useWardFacilities(wardId: string | null) {
  return useQuery({
    queryKey: ['ward-facilities', wardId],
    queryFn: () => api.facilities(wardId as string),
    enabled: Boolean(wardId),
    staleTime: WARD_STALE_MS,
    gcTime: WARD_GC_MS,
  })
}

export function useOccupational(wardId: string | null, date: string) {
  return useQuery({
    queryKey: ['occupational', wardId, date],
    queryFn: () => api.occupational(wardId as string, date),
    enabled: Boolean(wardId),
    staleTime: WARD_STALE_MS,
    gcTime: WARD_GC_MS,
  })
}

/** Everything the ward drill-down panel needs, in one call. */
export function useWard(wardId: string | null, days = FORECAST_DAYS) {
  const forecast = useWardForecast(wardId)
  const risk = useWardRisk(wardId, days)
  const facilities = useWardFacilities(wardId)

  return {
    forecast,
    risk,
    facilities,
    isLoading: forecast.isLoading || risk.isLoading,
    isError: forecast.isError || risk.isError,
  }
}
