'use client'
import { WeatherKpis } from '@/components/weather/WeatherKpis'
import { Precautions } from '@/components/help/Precautions'
import { useWeather } from '@/hooks/useWeather'
import { weatherReading } from '@/lib/weather'
import { heatIndexCelsius } from '@/lib/thermal'
import { DataStatus } from '@/components/data/DataStatus'

import { Printer } from 'lucide-react'
import { LocationSearch } from '@/components/location/LocationSearch'
import { useLocation } from '@/components/providers/LocationProvider'
import { WbgtChart } from '@/components/occupational/WbgtChart'
import { ScheduleTable } from '@/components/occupational/ScheduleTable'
import { Button } from '@/components/ui/button'
import { useOccupational } from '@/hooks/useWard'
import { useRiskMap } from '@/hooks/useRiskMap'
import { longDate } from '@/lib/utils'

export default function OccupationalPage() {
  const { location, selectedWardId, selectWard, selectedDate, setSelectedDate, dates } = useLocation()
  const weather = useWeather(), reading = weatherReading(weather.data).reading
  const riskMap = useRiskMap(selectedDate)
  const wards = riskMap.data && riskMap.data.date === selectedDate ? riskMap.data.wards : []
  const { data, isPending, isError, error } = useOccupational(selectedWardId, selectedDate)
  const matched = data?.ward_id === selectedWardId && data?.date === selectedDate ? data : undefined
  const wardName = matched?.ward_name ?? wards.find((ward) => ward.ward_id === selectedWardId)?.ward_name ?? selectedWardId
  const state = !location || !selectedWardId ? 'unavailable' : isPending ? 'loading' : isError ? 'error' : matched ? 'ready' : 'unavailable'

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Occupational heat exposure — work/rest schedule</h1>
        <p className="mt-1 text-xs tapas-subtext">Hourly WBGT and supplied work/rest guidance for outdoor workers. {longDate(selectedDate)} · {location?.timezone ?? 'Asia/Kolkata'}</p>
      </header>
      <div className="no-print mb-4 space-y-3">
        <LocationSearch />
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid max-w-full gap-1 text-xs font-medium">
            Covered ward
            <select className="h-11 max-w-full rounded-md border border-border bg-card px-2 text-sm" value={selectedWardId ?? ''} onChange={(event) => selectWard(event.target.value || null)}>
              <option value="">Select a ward with available data</option>
              {selectedWardId && !wards.some((ward) => ward.ward_id === selectedWardId) ? <option value={selectedWardId}>{wardName}</option> : null}
              {wards.map((ward) => <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Forecast date
            <select className="h-11 rounded-md border border-border bg-card px-2 text-sm" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
              {(dates.includes(selectedDate) ? dates : [...dates, selectedDate].sort()).map((date) => <option key={date} value={date}>{longDate(date)}</option>)}
            </select>
          </label>
        </div>
        {!selectedWardId ? <p className="text-xs tapas-subtext">{location ? `No ward selected for ${location.name}. Select a covered ward when its risk service provides one.` : 'Choose a location, then a ward with supplied occupational data.'}</p> : null}
        {riskMap.isError ? <p role="status" className="text-xs tapas-subtext">Ward coverage unavailable. Place search remains available.</p> : null}
      </div>
      <div className="print-page space-y-4"><WeatherKpis /><Precautions heatIndex={heatIndexCelsius(reading?.temperature, reading?.humidity)} selectedDate={selectedDate} />
        <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Hourly WBGT — {wardName || location?.name || 'choose a location'}</h2>
            <span className="text-xs tapas-subtext">{longDate(selectedDate)}</span>
          </div>
          {state === 'loading' ? <p className="py-8 text-center text-sm tapas-subtext">Loading WBGT forecast…</p>
            : state === 'error' ? <p role="status" className="py-8 text-center text-sm text-[var(--risk-4)]">{error instanceof Error ? error.message : 'WBGT forecast unavailable for this location and date.'}</p>
            : <WbgtChart hourly={matched?.hourly ?? []} />}
          <DataStatus label="Occupational guidance" provenance={matched?.provenance} />
        </div>
        <ScheduleTable data={matched} state={state} />
        <p className="text-xs tapas-subtext">WBGT depends on working conditions and exposure. Supplied guidance needs site-specific review; unavailable data does not establish safe working conditions.</p>
      </div>
      <div className="no-print mt-4">
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Download schedule PDF</Button>
        <p className="mt-1.5 text-[11px] tapas-subtext">Opens the browser print dialog — choose “Save as PDF”. Date and source status are included.</p>
      </div>
    </div>
  )
}
