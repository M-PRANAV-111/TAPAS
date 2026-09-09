'use client'

import { useState } from 'react'
import { Hospital, Send, CheckCircle2, Clock, CheckCheck, AlertCircle } from 'lucide-react'
import type { HealthcareFacility, FacilityReadinessState } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HealthcareReadinessProps {
  facilities: HealthcareFacility[]
  wardName?: string
  className?: string
  onNotifyFacility?: (facilityId: string) => void
}

export function HealthcareReadiness({
  facilities,
  wardName = 'Ward 42, Kukatpally',
  className,
  onNotifyFacility,
}: HealthcareReadinessProps) {
  const [facilityStates, setFacilityStates] = useState<Record<string, FacilityReadinessState>>(() => {
    const map: Record<string, FacilityReadinessState> = {}
    for (const f of facilities) {
      map[f.id] = f.notification_state
    }
    return map
  })

  const [simulatingId, setSimulatingId] = useState<string | null>(null)

  const handleAdvanceState = (facilityId: string) => {
    setSimulatingId(facilityId)
    setTimeout(() => {
      setFacilityStates((prev) => {
        const current = prev[facilityId] || 'NOT_SENT'
        let next: FacilityReadinessState = 'SENT'
        if (current === 'NOT_SENT') next = 'SENT'
        else if (current === 'SENT') next = 'DELIVERED'
        else if (current === 'DELIVERED') next = 'ACKNOWLEDGED'
        else next = 'ACKNOWLEDGED'
        return { ...prev, [facilityId]: next }
      })
      setSimulatingId(null)
      onNotifyFacility?.(facilityId)
    }, 450)
  }

  return (
    <section
      aria-labelledby="healthcare-readiness-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-4)] text-[var(--bg-base)]">
              <Hospital className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="healthcare-readiness-heading" className="metric-label text-[var(--text-secondary)]">
              Healthcare Facility Surge Readiness
            </h3>
          </div>
          <span className="rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
            {wardName}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Monitors hospital, PHC and CHC readiness status and operational transmission logs.
        </p>
      </div>

      {/* Facilities Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Facility Name &amp; Level</th>
              <th className="py-2.5 px-4">Distance</th>
              <th className="py-2.5 px-4">Heat Surge Alert</th>
              <th className="py-2.5 px-4">Notification State</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {facilities.map((fac) => {
              const currentState = facilityStates[fac.id] ?? fac.notification_state
              const isSimulating = simulatingId === fac.id

              const stateBadge =
                currentState === 'ACKNOWLEDGED' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <CheckCheck className="h-3 w-3" /> ACKNOWLEDGED
                  </span>
                ) : currentState === 'DELIVERED' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <CheckCircle2 className="h-3 w-3" /> DELIVERED
                  </span>
                ) : currentState === 'SENT' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-orange-950/70 border border-orange-800 text-orange-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <Clock className="h-3 w-3" /> SENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-stone-900 border border-stone-700 text-stone-400 px-2 py-0.5 font-semibold text-[10.5px]">
                    <AlertCircle className="h-3 w-3" /> NOT SENT
                  </span>
                )

              return (
                <tr key={fac.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text-primary)]">{fac.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {fac.bed_capacity_label} · {fac.status}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                    {fac.distance_km.toFixed(1)} km
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10.5px] font-bold uppercase',
                        fac.heat_risk_status === 'Critical' || fac.heat_risk_status === 'Severe'
                          ? 'bg-[var(--risk-5)]/40 border border-[var(--risk-4)] text-[var(--risk-4)]'
                          : 'bg-[var(--risk-3)]/20 border border-[var(--risk-3)] text-[var(--risk-3)]'
                      )}
                    >
                      {fac.heat_risk_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">{stateBadge}</td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSimulating || currentState === 'ACKNOWLEDGED'}
                      onClick={() => handleAdvanceState(fac.id)}
                      className={cn(
                        'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                        currentState === 'ACKNOWLEDGED'
                          ? 'opacity-60 cursor-default'
                          : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                      )}
                    >
                      {isSimulating ? (
                        'Updating…'
                      ) : currentState === 'NOT_SENT' ? (
                        <>
                          <Send className="mr-1 h-3 w-3 text-[var(--accent)]" /> Send Surge Alert
                        </>
                      ) : currentState === 'SENT' ? (
                        'Confirm Delivery'
                      ) : currentState === 'DELIVERED' ? (
                        'Acknowledge Reception'
                      ) : (
                        'Acknowledged'
                      )}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
