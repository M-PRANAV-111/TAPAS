'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Printer, Search } from 'lucide-react'

import { WbgtChart } from '@/components/occupational/WbgtChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOccupational } from '@/hooks/useWard'
import { useRiskMap } from '@/hooks/useRiskMap'
import {
  WBGT_BANDS,
  WBGT_SOURCE_NOTE,
  WBGT_TLV,
} from '@/lib/constants'
import type { OccupationalWindow } from '@/lib/types'
import { cn, longDate, todayIso } from '@/lib/utils'

export default function OccupationalPage() {
  const date = useMemo(() => todayIso(), [])
  const riskMap = useRiskMap(date)
  const wards = useMemo(() => riskMap.data?.wards ?? [], [riskMap.data])

  const [wardId, setWardId] = useState<string | null>(null)

  // Default to the hottest ward — the one a labour inspector cares about.
  useEffect(() => {
    if (wardId || wards.length === 0) return
    const hottest = [...wards].sort(
      (a, b) => b.risk_level - a.risk_level || b.utci_max - a.utci_max,
    )[0]
    setWardId(hottest.ward_id)
  }, [wards, wardId])

  const { data, isPending, isError } = useOccupational(wardId, date)
  const wardName =
    data?.ward_name ?? wards.find((w) => w.ward_id === wardId)?.ward_name ?? ''

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">
          Occupational heat exposure — work/rest schedule
        </h1>
        <p className="mt-0.5 text-xs tapas-subtext">
          Hourly WBGT and the resulting work/rest guidance for outdoor workers.{' '}
          {longDate(date)}
        </p>
      </header>

      <div className="no-print mb-4">
        <WardSelect
          wards={wards.map((w) => ({ id: w.ward_id, name: w.ward_name }))}
          value={wardId}
          valueLabel={wardName}
          onChange={setWardId}
        />
      </div>

      <div className="print-page space-y-4">
        <div className="rounded-lg border border-border bg-white p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              24-hour WBGT — {wardName || 'select a ward'}
            </h2>
            <span className="text-xs tapas-subtext">{longDate(date)}</span>
          </div>

          {isPending && wardId ? (
            <p className="py-8 text-center text-sm tapas-subtext">
              Loading WBGT forecast…
            </p>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-[var(--risk-4)]">
              WBGT forecast unavailable for this ward.
            </p>
          ) : (
            <WbgtChart hourly={data?.hourly ?? []} />
          )}
        </div>

        <ScheduleTable
          safe={data?.safe_windows ?? []}
          avoid={data?.avoid_windows ?? []}
          workRest={data?.work_rest ?? null}
        />

        <p className="text-xs tapas-subtext">{WBGT_SOURCE_NOTE}</p>
      </div>

      <div className="no-print mt-4">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Download schedule PDF
        </Button>
        <p className="mt-1.5 text-[11px] tapas-subtext">
          Opens the browser print dialog — choose &ldquo;Save as PDF&rdquo; to
          keep a copy for the site file.
        </p>
      </div>
    </div>
  )
}

function ScheduleTable({
  safe,
  avoid,
  workRest,
}: {
  safe: OccupationalWindow[]
  avoid: OccupationalWindow[]
  workRest: { window: OccupationalWindow; work_pct: number; rest_pct: number } | null
}) {
  const fmt = (windows: OccupationalWindow[]) =>
    windows.length > 0
      ? windows.map((w) => `${w.start}–${w.end}`).join(', ')
      : 'None'

  const rows = [
    {
      label: 'Safe windows',
      value: fmt(safe),
      color: WBGT_BANDS.safe.color,
      hint: `WBGT below ${WBGT_BANDS.safe.max}°C`,
    },
    {
      label: `Avoid (above ${WBGT_BANDS.danger.min}°C)`,
      value: fmt(avoid),
      color: WBGT_BANDS.danger.color,
      hint: 'Heavy outdoor work should stop',
    },
    {
      label: 'Work/rest ratio',
      value: workRest
        ? `${workRest.work_pct}% work / ${workRest.rest_pct}% rest for ${workRest.window.start}–${workRest.window.end}`
        : 'Continuous work permissible all day',
      color: WBGT_BANDS.warning.color,
      hint: `Applies above the ${WBGT_TLV}°C TLV`,
    },
  ]

  return (
    <div
      className="rounded-lg border border-border bg-white p-3 sm:p-4"
      data-testid="work-schedule"
    >
      <h2 className="mb-2 text-sm font-semibold">Work schedule</h2>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0"
          >
            <dt className="flex min-w-[11rem] items-center gap-2 text-xs font-medium tapas-subtext">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
              {row.label}
            </dt>
            <dd className="flex-1 text-sm font-medium">{row.value}</dd>
            <dd className="w-full text-[11px] tapas-subtext sm:w-auto">
              {row.hint}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Type-to-filter ward picker — 197 wards is too many for a plain select. */
function WardSelect({
  wards,
  value,
  valueLabel,
  onChange,
}: {
  wards: { id: string; name: string }[]
  value: string | null
  valueLabel: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = wards.filter((w) =>
    w.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div ref={containerRef} className="relative max-w-sm">
      <label
        htmlFor="ward-search"
        className="mb-1 block text-xs font-medium tapas-subtext"
      >
        Ward
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tapas-subtext"
          aria-hidden="true"
        />
        <Input
          id="ward-search"
          className="pl-8"
          role="combobox"
          aria-expanded={open}
          aria-controls="ward-options"
          autoComplete="off"
          placeholder="Search ward by name"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
        />
      </div>

      {valueLabel ? (
        <p className="mt-1 text-[11px] tapas-subtext">
          Showing <span className="font-medium text-foreground">{valueLabel}</span>
        </p>
      ) : null}

      {open ? (
        <ul
          id="ward-options"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-white py-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs tapas-subtext">
              No ward matches &ldquo;{query}&rdquo;
            </li>
          ) : null}
          {filtered.map((ward) => (
            <li key={ward.id}>
              <button
                type="button"
                role="option"
                aria-selected={ward.id === value}
                onClick={() => {
                  onChange(ward.id)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-secondary',
                  ward.id === value && 'font-semibold',
                )}
              >
                {ward.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
