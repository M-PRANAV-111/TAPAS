'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, X } from 'lucide-react'

import { useLastUpdated } from '@/hooks/useRiskMap'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatDateTime } from '@/lib/utils'

/**
 * A warning system that fails silently when offline is worse than no system.
 *
 * The banner states the age of the data on screen, and dismissing it only
 * silences the current outage — if the connection drops again the banner comes
 * back.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const lastUpdated = useLastUpdated()
  const [dismissed, setDismissed] = useState(false)
  const wasOnline = useRef(true)

  useEffect(() => {
    // Re-arm on every fresh transition into the offline state.
    if (!online && wasOnline.current) setDismissed(false)
    wasOnline.current = online
  }, [online])

  if (online || dismissed) return null

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="flex items-start gap-2 border-b border-[#E5C158] bg-[#FDF3D0] px-3 py-2 text-[#6B5312] no-print sm:px-4"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-xs leading-relaxed sm:text-sm">
        <span className="font-semibold">No internet connection</span> — showing
        data from{' '}
        {lastUpdated ? formatDateTime(new Date(lastUpdated).toISOString()) : 'the last successful update'}
        . Refresh when online for the latest forecast.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
