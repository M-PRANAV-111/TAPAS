'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { LocationSearch } from '@/components/location/LocationSearch'
import { useLocation } from '@/components/providers/LocationProvider'
import { WeatherKpis } from '@/components/weather/WeatherKpis'
import { DataStatus } from '@/components/data/DataStatus'
import { MapControls } from '@/components/map/MapControls'
import { fetchHeatGrid, snapshotGrid, NATIONAL_BOUNDS } from '@/lib/heatGrid'
import { coordinateLocation } from '@/lib/location'
import { formatHeatIndex } from '@/lib/thermal'
import { formatDateTime, formatTemp } from '@/lib/utils'
const HeatMap = dynamic(() => import('@/components/map/HeatMap'), { ssr: false })
function AuthorityOverview() {
  const { location, selectedDate, setSelectedDate, dates, selectLocation, selectionQuery } = useLocation()
  const query = useQuery({ queryKey: ['heat-grid', 'national', selectedDate], queryFn: ({ signal }) => fetchHeatGrid(NATIONAL_BOUNDS, 3, selectedDate, signal), initialData: () => snapshotGrid(NATIONAL_BOUNDS, 3, selectedDate), initialDataUpdatedAt: 0, staleTime: 15 * 60_000, retry: false })
  const ranked = [...(query.data?.points ?? [])].filter(p => p.heatIndex !== null).sort((a, b) => b.heatIndex! - a.heatIndex!).slice(0, 12)
  return <div className="mx-auto max-w-[1800px] space-y-4 px-3 py-4"><header><h1 className="text-xl font-semibold">Higher Authority · regional overview</h1><p className="mt-1 text-sm tapas-subtext">Compare sampled model conditions, then select a point for local detail. This is not a government warning or a ranking of every Indian city.</p></header><div className="flex flex-wrap gap-3"><Link className="flex min-h-11 items-center rounded border bg-white px-3 text-sm" href={`/alerts?${selectionQuery}`}>Review alerts for selected location</Link><button className="min-h-11 rounded border bg-white px-3 text-sm" onClick={() => selectLocation(null)}>Show India overview</button></div><LocationSearch /><WeatherKpis /><div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]"><div className="min-w-0 space-y-3"><div className="h-[85dvh] min-h-[720px]"><HeatMap location={location} selectedDate={selectedDate} wards={[]} selectedWardId={null} onWardSelect={() => {}} /></div><MapControls dates={dates} selectedDate={selectedDate} onDateChange={setSelectedDate} /></div><section className="min-w-0 rounded-lg border bg-white p-3"><h2 className="font-semibold">Highest Heat Index among national samples</h2><p className="my-2 text-xs tapas-subtext">Up to 12 of {query.data?.points.length ?? 'unavailable'} returned samples. Rows outside the Heat Index domain are excluded. Valid times may differ; inspect each row.</p><DataStatus label="National comparison" provenance={query.data?.provenance} loading={query.isLoading} error={query.error} />{ranked.length ? <ol className="mt-3 divide-y" data-testid="national-ranking">{ranked.map((p, i) => <li key={p.id} className="py-2"><button className="min-h-11 w-full text-left text-sm font-medium underline" onClick={() => selectLocation({ ...coordinateLocation(p.latitude, p.longitude), name: p.name, source: 'Open-Meteo sampled point' })}>{i + 1}. {p.name} · HI {formatHeatIndex(p.heatIndex)}</button><p className="text-xs tapas-subtext">Air {formatTemp(p.temperature)} · RH {p.humidity === null ? 'Unavailable' : `${p.humidity}%`} · {formatDateTime(p.time)}</p></li>)}</ol> : <p className="mt-3 text-sm">No valid Heat Index values to rank. This does not establish safe conditions.</p>}</section></div></div>
}
export default function AuthorityPage() { return <RoleGuard role="authority"><AuthorityOverview /></RoleGuard> }
