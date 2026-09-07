'use client'
import { OfficialHelp } from '@/components/help/OfficialHelp'
import { DataStatus } from '@/components/data/DataStatus'

import { useEffect, useState } from 'react'
import { AlertCard } from '@/components/alerts/AlertCard'
import { alertValidity } from '@/components/alerts/validity'
import { LocationSearch } from '@/components/location/LocationSearch'
import { useLocation } from '@/components/providers/LocationProvider'
import { useAlerts } from '@/hooks/useAlerts'
import { longDate } from '@/lib/utils'

export default function AlertsPage() {
  const { location, selectedWardId, selectedDate, setSelectedDate, dates } = useLocation()
  const { data, isLoading: isPending, isError, error, isFetching } = useAlerts(1, 200)
  const [level, setLevel] = useState('all')
  const [showExpired, setShowExpired] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const alerts = data?.alerts ?? []
  const filtered = alerts.filter((alert) => {
    if (alert.date !== selectedDate) return false
    if (selectedWardId && alert.ward_id !== selectedWardId) return false
    if (level !== 'all' && alert.risk_level !== Number(level)) return false
    if (!showExpired && alertValidity(alert, now) === 'expired') return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Heat alerts and advisories</h1>
        <p className="mt-1 text-xs tapas-subtext">
          {location ? `Advisories requested for ${location.name}${selectedWardId ? ' and the selected ward' : ''}.` : 'Choose a place to request local advisory coverage.'}
          {' '}Source-issued messages are shown with their available validity metadata.
        </p>
      </header>
      <div className="mb-4"><LocationSearch /></div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Risk level
          <select className="h-11 rounded-md border border-border bg-white px-2 text-sm" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">All levels</option>
            <option value="5">Level 5 — Extreme</option><option value="4">Level 4 — Very High</option>
            <option value="3">Level 3 — High</option><option value="2">Level 2 — Moderate</option><option value="1">Level 1 — Low</option>
          </select>
        </label>
        <label className="grid max-w-full gap-1 text-xs font-medium">
          Selected date
          <select className="h-11 max-w-full rounded-md border border-border bg-white px-2 text-sm" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {(dates.includes(selectedDate) ? dates : [...dates, selectedDate].sort()).map((date) => <option value={date} key={date}>{longDate(date)}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={showExpired} onChange={(event) => setShowExpired(event.target.checked)} />Include expired messages</label>
      </div>
      <DataStatus label="Alerts" provenance={data?.provenance} refreshing={isFetching} error={error} />
      {isPending ? <p role="status" className="text-sm tapas-subtext">Loading alerts…</p> : null}
      {isError ? <p role="status" className="text-sm text-[var(--risk-4)]">{error instanceof Error ? error.message : 'Alert service unavailable.'} This does not mean no warnings exist. Check the official bulletin linked in Government information.</p> : null}
      {!isPending && !isError && !filtered.length ? <p data-testid="no-alerts" className="rounded-lg border border-border bg-white p-6 text-center text-sm tapas-subtext">{location ? 'No matching messages were returned for this location, date and filter. Missing alerts do not establish safe conditions.' : 'Select a location to check advisories. No scientific alert feed has been requested yet.'}</p> : null}
      <OfficialHelp location={location} selectedDate={selectedDate} /><div className="space-y-3">{filtered.map((alert) => <AlertCard key={alert.id} alert={alert} now={now} />)}</div>
    </div>
  )
}
