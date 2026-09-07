'use client'

import { useMemo, useState } from 'react'

import { AlertCard } from '@/components/alerts/AlertCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAlerts } from '@/hooks/useAlerts'
import { shortDate } from '@/lib/utils'

const ALL = 'all'

export default function AlertsPage() {
  // Fetch from level 1 so the level filter can widen as well as narrow.
  const { data, isPending, isError } = useAlerts(1, 200)
  const alerts = useMemo(() => data?.alerts ?? [], [data])

  const [level, setLevel] = useState<string>('4')
  const [city, setCity] = useState<string>(ALL)
  const [date, setDate] = useState<string>(ALL)

  const cities = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.city))).sort(),
    [alerts],
  )
  const dates = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.date))).sort(),
    [alerts],
  )

  const filtered = alerts.filter((alert) => {
    if (level !== ALL && alert.risk_level !== Number(level)) return false
    if (city !== ALL && alert.city !== city) return false
    if (date !== ALL && alert.date !== date) return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Active alerts</h1>
        <p className="mt-0.5 text-xs tapas-subtext">
          Ward advisories issued from the current forecast run. Level 4 and
          above are pushed to the state EOC as CAP messages.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Filter label="Level" value={level} onChange={setLevel}>
          <SelectItem value={ALL}>All levels</SelectItem>
          <SelectItem value="5">Level 5 — Extreme</SelectItem>
          <SelectItem value="4">Level 4 — Very High</SelectItem>
          <SelectItem value="3">Level 3 — High</SelectItem>
        </Filter>

        <Filter label="City" value={city} onChange={setCity}>
          <SelectItem value={ALL}>All cities</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </Filter>

        <Filter label="Date" value={date} onChange={setDate}>
          <SelectItem value={ALL}>All dates</SelectItem>
          {dates.map((d) => (
            <SelectItem key={d} value={d}>
              {shortDate(d)}
            </SelectItem>
          ))}
        </Filter>
      </div>

      {isPending ? (
        <p className="text-sm tapas-subtext">Loading alerts…</p>
      ) : null}

      {isError ? (
        <p className="text-sm text-[var(--risk-4)]">
          Alert service unreachable. Do not assume there are no alerts — check
          the IMD bulletin directly.
        </p>
      ) : null}

      {!isPending && !isError && filtered.length === 0 ? (
        <p
          data-testid="no-alerts"
          className="rounded-lg border border-border bg-white p-6 text-center text-sm tapas-subtext"
        >
          No active alerts for this filter.
        </p>
      ) : null}

      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium tapas-subtext">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[11.5rem] text-xs" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  )
}
