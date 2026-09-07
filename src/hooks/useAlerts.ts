'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

/**
 * Active alerts at or above `level`. Alerts change on the operational cycle,
 * not by the minute, so a 10-minute stale window is plenty.
 */
export function useAlerts(level = 4, limit = 50) {
  return useQuery({
    queryKey: ['alerts', level, limit],
    queryFn: () => api.alerts(level, limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useHindcast() {
  return useQuery({
    queryKey: ['hindcast'],
    queryFn: () => api.hindcast(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
