'use client'

import { useState } from 'react'
import { Users2, Phone, Bell, Check } from 'lucide-react'
import type { Official, ASHAWorker } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LocalResponseNetworkProps {
  officials: Official[]
  ashaWorkers?: ASHAWorker[]
  wardName?: string
  className?: string
  onNotify?: (person: Official | ASHAWorker) => void
}

export function LocalResponseNetwork({
  officials,
  ashaWorkers = [],
  wardName = 'Ward 42, Kukatpally',
  className,
  onNotify,
}: LocalResponseNetworkProps) {
  const [notifiedIds, setNotifiedIds] = useState<Record<string, boolean>>({})
  const [calledIds, setCalledIds] = useState<Record<string, boolean>>({})

  const handleNotify = (id: string, person: Official | ASHAWorker) => {
    setNotifiedIds((prev) => ({ ...prev, [id]: true }))
    onNotify?.(person)
  }

  const handleCall = (id: string) => {
    setCalledIds((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <section
      aria-labelledby="response-network-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <Users2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="response-network-heading" className="metric-label text-[var(--text-secondary)]">
              Local Response Network
            </h3>
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{wardName}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Local emergency contacts, field health mobilizers, and administrative leads.
        </p>
      </div>

      {/* Network List Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Role / Designation</th>
              <th className="py-2.5 px-4">Officer Name</th>
              <th className="py-2.5 px-4">Field Status</th>
              <th className="py-2.5 px-4">Contact</th>
              <th className="py-2.5 px-4 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {officials.map((official) => {
              const isNotified = notifiedIds[official.id]
              const isCalled = calledIds[official.id]

              return (
                <tr key={official.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[var(--text-secondary)]">
                    {official.designation}
                  </td>
                  <td className="py-3 px-4 font-medium">{official.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                        official.available
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      )}
                    >
                      {official.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {official.phone_masked}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!official.available || isNotified}
                        onClick={() => handleNotify(official.id, official)}
                        className={cn(
                          'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                          isNotified
                            ? 'text-emerald-400 border-emerald-800'
                            : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                        )}
                      >
                        {isNotified ? (
                          <>
                            <Check className="mr-1 h-3 w-3" /> Notified
                          </>
                        ) : (
                          <>
                            <Bell className="mr-1 h-3 w-3 text-[var(--accent)]" /> Notify
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!official.available}
                        onClick={() => handleCall(official.id)}
                        className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                      >
                        <Phone className="mr-1 h-3 w-3 text-[var(--text-secondary)]" />
                        {isCalled ? 'Calling…' : 'Call'}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {ashaWorkers.map((worker) => {
              const isNotified = notifiedIds[worker.id]
              const isCalled = calledIds[worker.id]

              return (
                <tr key={worker.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[var(--text-secondary)]">
                    ASHA Worker
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {worker.name}{' '}
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      ({worker.coverage_area})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 text-[10.5px] font-semibold">
                      {worker.on_duty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {worker.phone_masked}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!worker.on_duty || isNotified}
                        onClick={() => handleNotify(worker.id, worker)}
                        className={cn(
                          'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                          isNotified
                            ? 'text-emerald-400 border-emerald-800'
                            : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                        )}
                      >
                        {isNotified ? (
                          <>
                            <Check className="mr-1 h-3 w-3" /> Notified
                          </>
                        ) : (
                          <>
                            <Bell className="mr-1 h-3 w-3 text-[var(--accent)]" /> Notify
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!worker.on_duty}
                        onClick={() => handleCall(worker.id)}
                        className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                      >
                        <Phone className="mr-1 h-3 w-3 text-[var(--text-secondary)]" />
                        {isCalled ? 'Calling…' : 'Call'}
                      </Button>
                    </div>
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
