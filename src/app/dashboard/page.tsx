'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListOrdered, MapPin } from 'lucide-react'

import { MapControls } from '@/components/map/MapControls'
import { RiskRanking } from '@/components/risk/RiskRanking'
import { WardPanel } from '@/components/ward/WardPanel'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useRiskMap, useWardGeojson } from '@/hooks/useRiskMap'
import { FORECAST_DAYS, PILOT_CITY } from '@/lib/constants'
import { cn, forecastDates, formatDateTime, todayIso } from '@/lib/utils'

// MapLibre touches `window` at module scope, so the map never renders on the
// server.
const HeatMap = dynamic(() => import('@/components/map/HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg border border-border bg-white">
      <p className="text-sm tapas-subtext">Loading map…</p>
    </div>
  ),
})

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm tapas-subtext">Loading…</div>}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  const searchParams = useSearchParams()
  const isDesktop = useIsDesktop()
  const online = useOnlineStatus()

  const dates = useMemo(() => forecastDates(FORECAST_DAYS), [])
  const [selectedDate, setSelectedDate] = useState(() => todayIso())
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null)
  const [rankingOpen, setRankingOpen] = useState(false)

  // /alerts links here with ?ward=… to jump straight to a ward.
  useEffect(() => {
    const ward = searchParams.get('ward')
    if (ward) setSelectedWardId(ward)
    const date = searchParams.get('date')
    if (date && dates.includes(date)) setSelectedDate(date)
  }, [searchParams, dates])

  const geojson = useWardGeojson()
  const riskMap = useRiskMap(selectedDate)

  const wards = riskMap.data?.wards ?? []
  const selectedWard = wards.find((w) => w.ward_id === selectedWardId)

  const handleWardSelect = useCallback((wardId: string) => {
    setSelectedWardId(wardId)
    setRankingOpen(false)
  }, [])

  const closeWard = useCallback(() => setSelectedWardId(null), [])

  // Offline with nothing in cache: grey the map rather than show an empty city.
  const mapUnavailable = !online && wards.length === 0

  const panelOpen = Boolean(selectedWardId)

  return (
    <div className="mx-auto max-w-[1800px] px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Ward Heat Risk Forecast — {riskMap.data?.city ?? PILOT_CITY}
        </h1>
        <p className="text-xs tapas-subtext">
          {riskMap.data?.generated_at
            ? `Forecast issued ${formatDateTime(riskMap.data.generated_at)}`
            : 'Awaiting forecast run'}
        </p>
      </div>

      <div
        className={cn(
          'grid gap-3 lg:h-[calc(100vh-8.5rem)]',
          panelOpen && isDesktop
            ? 'lg:grid-cols-[minmax(180px,19%)_minmax(0,1fr)_minmax(320px,30%)]'
            : 'lg:grid-cols-[minmax(200px,20%)_minmax(0,1fr)]',
        )}
      >
        {/* Left — ranking. Bottom sheet on mobile. */}
        <div className="hidden min-h-0 rounded-lg border border-border bg-white lg:block">
          <RiskRanking
            date={selectedDate}
            selectedWardId={selectedWardId}
            onSelect={handleWardSelect}
          />
        </div>

        {/* Centre — map, slider, legend. */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="h-[52vh] min-h-[280px] lg:h-auto lg:min-h-0 lg:flex-1">
            <HeatMap
              geojson={geojson.data}
              wards={wards}
              selectedWardId={selectedWardId}
              onWardSelect={handleWardSelect}
              unavailable={mapUnavailable}
            />
          </div>

          <MapControls
            dates={dates}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setRankingOpen(true)}
          >
            <ListOrdered className="h-4 w-4" />
            Highest risk wards
          </Button>
        </div>

        {/* Right — ward drill-down. Slides up from the bottom on mobile. */}
        {panelOpen && isDesktop ? (
          <div className="hidden min-h-0 overflow-hidden rounded-lg border border-border lg:block">
            <WardPanel
              wardId={selectedWardId as string}
              wardName={selectedWard?.ward_name}
              selectedDate={selectedDate}
              onDaySelect={setSelectedDate}
              onClose={closeWard}
            />
          </div>
        ) : null}
      </div>

      {!panelOpen && isDesktop ? (
        <p className="mt-2 hidden items-center gap-1.5 text-xs tapas-subtext lg:flex">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Select a ward on the map or in the ranking to open its 5-day
          drill-down.
        </p>
      ) : null}

      {/* Mobile: ranking sheet */}
      <Sheet open={rankingOpen && !isDesktop} onOpenChange={setRankingOpen}>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Highest risk wards</SheetTitle>
            <SheetDescription>
              Wards ranked by risk level for the selected forecast day.
            </SheetDescription>
          </SheetHeader>
          <div className="h-full pt-2">
            <RiskRanking
              date={selectedDate}
              selectedWardId={selectedWardId}
              onSelect={handleWardSelect}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: ward panel sheet */}
      <Sheet
        open={panelOpen && !isDesktop}
        onOpenChange={(open) => {
          if (!open) closeWard()
        }}
      >
        <SheetContent side="bottom" className="h-[88vh] p-0" hideClose>
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedWard?.ward_name ?? 'Ward detail'}</SheetTitle>
            <SheetDescription>
              Five-day outlook, forecast chart, advisory and facilities.
            </SheetDescription>
          </SheetHeader>
          {selectedWardId ? (
            <WardPanel
              wardId={selectedWardId}
              wardName={selectedWard?.ward_name}
              selectedDate={selectedDate}
              onDaySelect={setSelectedDate}
              onClose={closeWard}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
