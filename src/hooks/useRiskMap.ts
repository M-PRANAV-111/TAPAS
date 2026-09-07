'use client'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import { api, isDemoMode, subscribeDemoMode } from '@/lib/api'
import type { RiskMapResponse, WardCollection, WardRisk } from '@/lib/types'

/** Cached long enough that flipping between days is instant. */
const RISK_STALE_MS = 30 * 60 * 1000
const RISK_GC_MS = 24 * 60 * 60 * 1000

export const riskMapKey = (date: string) => ['risk-map', date] as const
export const rankingKey = (date: string, limit: number) =>
  ['risk-ranking', date, limit] as const

/**
 * Ward risk for one forecast day. The date is part of the query key, so the
 * five slider positions each keep their own cache entry and switching back to
 * a visited day repaints from cache with no refetch.
 */
export function useRiskMap(date: string) {
  return useQuery({
    queryKey: riskMapKey(date),
    queryFn: () => api.riskMap(date),
    staleTime: RISK_STALE_MS,
    gcTime: RISK_GC_MS,
    placeholderData: keepPreviousData,
  })
}

export function useRiskRanking(date: string, limit = 10) {
  return useQuery({
    queryKey: rankingKey(date, limit),
    queryFn: () => api.ranking(date, limit),
    staleTime: RISK_STALE_MS,
    gcTime: RISK_GC_MS,
    placeholderData: keepPreviousData,
  })
}

/**
 * Ward polygons. Static file, served from /public, never refetched — the
 * geometry does not change between forecast runs.
 */
export function useWardGeojson() {
  return useQuery({
    queryKey: ['ward-geojson'],
    queryFn: async (): Promise<WardCollection> => {
      const res = await fetch('/ward-hyderabad.geojson')
      if (!res.ok) throw new Error(`ward geojson: ${res.status}`)
      return (await res.json()) as WardCollection
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Look up one ward's row in an already-fetched risk map response. */
export function findWard(
  data: RiskMapResponse | undefined,
  wardId: string | null,
): WardRisk | undefined {
  if (!data || !wardId) return undefined
  return data.wards.find((w) => w.ward_id === wardId)
}

/**
 * The newest successful fetch across every cached query — the "data from…"
 * timestamp the offline banner shows.
 */
export function useLastUpdated(): number | null {
  const queryClient = useQueryClient()
  const entries = queryClient
    .getQueryCache()
    .getAll()
    .map((q) => q.state.dataUpdatedAt)
    .filter((t) => t > 0)

  return entries.length > 0 ? Math.max(...entries) : null
}

/**
 * True when the API client had to fall back to bundled demo data. Surfaced in
 * the navbar so nobody mistakes demo numbers for a live forecast.
 */
export function useDemoMode(): boolean {
  return useSyncExternalStore(
    subscribeDemoMode,
    isDemoMode,
    () => false,
  )
}
