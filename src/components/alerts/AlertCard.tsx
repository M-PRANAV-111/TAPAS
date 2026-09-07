'use client'

import Link from 'next/link'
import { AlertTriangle, MapPin } from 'lucide-react'

import { CapDownload } from '@/components/alerts/CapDownload'
import { Button } from '@/components/ui/button'
import {
  RISK_COLORS,
  RISK_LABELS,
  RISK_TEXT_COLORS,
} from '@/lib/constants'
import type { Alert } from '@/lib/types'
import { formatDateTime, longDate } from '@/lib/utils'

export function AlertCard({ alert }: { alert: Alert }) {
  const level = alert.risk_level

  return (
    <article
      data-testid="alert-card"
      className="overflow-hidden rounded-lg border border-border bg-white"
    >
      <header
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2"
        style={{
          backgroundColor: RISK_COLORS[level],
          color: RISK_TEXT_COLORS[level],
        }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-bold uppercase tracking-wide">
          Level {level} — {RISK_LABELS[level]}
        </h3>
        <span aria-hidden="true" className="opacity-70">
          ·
        </span>
        <span className="text-sm font-semibold">{alert.ward_name}</span>
        <span className="ml-auto text-xs opacity-90">{longDate(alert.date)}</span>
      </header>

      <div className="p-3">
        <p className="text-sm leading-relaxed">{alert.advisory_en}</p>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <p className="text-[11px] tapas-subtext">
          Issued {formatDateTime(alert.issued_at)}
          {alert.ward_count
            ? ` · ${alert.ward_count} ward${alert.ward_count === 1 ? '' : 's'}`
            : ''}
          {alert.city ? ` · ${alert.city}` : ''}
        </p>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/dashboard?ward=${encodeURIComponent(alert.ward_id)}&date=${alert.date}`}
            >
              <MapPin className="h-4 w-4" />
              View on map
            </Link>
          </Button>
          <CapDownload alertId={alert.id} wardName={alert.ward_name} />
        </div>
      </footer>
    </article>
  )
}
