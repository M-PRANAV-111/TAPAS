'use client'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { LocationSearch } from '@/components/location/LocationSearch'
import { WeatherKpis } from '@/components/weather/WeatherKpis'
import { DataStatus } from '@/components/data/DataStatus'
import { NearbyHelp } from '@/components/help/NearbyHelp'
import { Precautions } from '@/components/help/Precautions'
import { OfficialHelp } from '@/components/help/OfficialHelp'
import { EmergencyHelp } from '@/components/help/EmergencyHelp'
import { MapControls } from '@/components/map/MapControls'
import { RiskRanking } from '@/components/risk/RiskRanking'
import { WardPanel } from '@/components/ward/WardPanel'
import { Button } from '@/components/ui/button'
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useRiskMap, useWardGeojson } from '@/hooks/useRiskMap'
import { useWardForecast } from '@/hooks/useWard'
import { useWeather } from '@/hooks/useWeather'
import { weatherReading } from '@/lib/weather'
import { heatIndexCelsius } from '@/lib/thermal'
import { useResources } from '@/hooks/useResources'
import { filterResources, type ResourceCategory, type SafetyResource } from '@/lib/resources'
import { toIsoDate } from '@/lib/utils'
const HeatMap=dynamic(()=>import('@/components/map/HeatMap'),{ssr:false,loading:()=><div className="h-full rounded-lg border p-4 text-sm">Loading map…</div>})
export function CitizenDashboard({officer=false}:{officer?:boolean}) {
  const {location,selectedDate,setSelectedDate,dates,selectedWardId,selectWard}=useLocation(), isDesktop=useIsDesktop()
  const [rankingOpen,setRankingOpen]=useState(false), [category,setCategory]=useState<ResourceCategory>('all'),[selectedResourceId,setSelectedResourceId]=useState<string|null>(null)
  const weather=useWeather(), reading=weatherReading(weather.data).reading
  const geojson=useWardGeojson(), riskMap=useRiskMap(selectedDate), nearby=useResources(location), forecast=useWardForecast(selectedWardId)
  const wards=useMemo(()=>riskMap.data?.wards ?? [],[riskMap.data]), selectedWard=wards.find(w=>w.ward_id===selectedWardId)
  const risk=selectedWardId ? selectedWard : riskMap.data?.summary
  const resources=useMemo(()=>filterResources(nearby.data?.resources ?? [],category),[nearby.data,category])
  const selectedResource=resources.some(r=>r.id===selectedResourceId) ? selectedResourceId : null
  const wbgtValues=forecast.data?.hourly.filter(h=>toIsoDate(new Date(h.time))===selectedDate).map(h=>h.wbgt).filter((v):v is number=>typeof v==='number' && Number.isFinite(v)) ?? []
  const onWardSelect=useCallback((id:string)=>{selectWard(id);setRankingOpen(false)},[selectWard])
  const onResourceSelect=useCallback((resource:SafetyResource)=>{setSelectedResourceId(resource.id);document.getElementById('heat-map')?.scrollIntoView({behavior:'auto',block:'center'})},[])
  const panelOpen=!!selectedWardId
  const panel=selectedWardId ? <WardPanel wardId={selectedWardId} wardName={selectedWard?.ward_name} selectedDate={selectedDate} onDaySelect={setSelectedDate} onClose={()=>selectWard(null)} officer={officer}/>:null
  return <div className="mx-auto max-w-[1800px] space-y-4 px-3 py-4 sm:px-4"><header><h1 className="text-lg font-semibold tracking-tight">{officer?'Mandal Officer · local heat operations':'India Heat & Safety Dashboard'}</h1><p className="mt-1 text-sm tapas-subtext">Find your place, understand available heat information and locate nearby help.</p></header><LocationSearch/><WeatherKpis risk={risk} wbgt={wbgtValues.length ? Math.max(...wbgtValues):null}/><details className="rounded-lg border bg-card p-3 text-xs"><summary className="cursor-pointer font-medium">Optional ward science and boundary coverage</summary><DataStatus label="Ward risk" provenance={riskMap.data?.provenance} loading={riskMap.isLoading} error={riskMap.error}/><DataStatus label="Ward boundaries" provenance={geojson.data?.provenance} loading={geojson.isLoading} error={geojson.error}/></details><div className={`grid items-start gap-3 ${panelOpen && isDesktop ? 'lg:grid-cols-[minmax(180px,19%)_minmax(0,1fr)_minmax(300px,30%)]':'lg:grid-cols-[minmax(200px,20%)_minmax(0,1fr)]'}`}><div className="hidden max-h-[760px] overflow-auto rounded-lg border bg-card lg:block"><RiskRanking date={selectedDate} selectedWardId={selectedWardId} onSelect={onWardSelect}/></div><div className="min-w-0 space-y-3"><div className="h-[85dvh] min-h-[720px] lg:h-[720px]"><HeatMap location={location} selectedDate={selectedDate} geojson={geojson.data} wards={wards} selectedWardId={selectedWardId} onWardSelect={onWardSelect} resources={resources} selectedResourceId={selectedResource} onResourceSelect={onResourceSelect}/></div><MapControls dates={dates} selectedDate={selectedDate} onDateChange={setSelectedDate}/><Button variant="outline" className="min-h-11 w-full lg:hidden" onClick={()=>setRankingOpen(true)}><ListOrdered className="h-4 w-4"/>Highest risk wards</Button></div>{panelOpen && isDesktop ? <div className="max-h-[800px] overflow-auto rounded-lg border">{panel}</div>:null}</div><div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><NearbyHelp location={location} resources={resources} selectedResourceId={selectedResource} onResourceSelect={onResourceSelect} category={category} onCategoryChange={value=>{setCategory(value);setSelectedResourceId(null)}} isLoading={nearby.isLoading} isError={nearby.isError} error={nearby.error} status={nearby.data?.status} originalAt={nearby.data?.originalAt} note={nearby.data?.note} fetchedAt={nearby.data?.fetchedAt} limitations={nearby.data?.limitations} onRetry={()=>void nearby.refetch()}/><Precautions heatIndex={heatIndexCelsius(reading?.temperature,reading?.humidity)} riskLevel={risk?.risk_level} selectedDate={selectedDate}/></div><EmergencyHelp/><OfficialHelp location={location} selectedDate={selectedDate}/><Sheet open={rankingOpen && !isDesktop} onOpenChange={setRankingOpen}><SheetContent side="bottom" className="h-[75dvh] p-0"><SheetHeader className="sr-only"><SheetTitle>Highest risk wards</SheetTitle><SheetDescription>Ranked wards for the selected area and date.</SheetDescription></SheetHeader><RiskRanking date={selectedDate} selectedWardId={selectedWardId} onSelect={onWardSelect}/></SheetContent></Sheet><Sheet open={panelOpen && !isDesktop} onOpenChange={open=>{if(!open)selectWard(null)}}><SheetContent side="bottom" className="h-[88dvh] p-0" hideClose><SheetHeader className="sr-only"><SheetTitle>{selectedWard?.ward_name ?? 'Ward detail'}</SheetTitle><SheetDescription>Forecast and source-backed guidance.</SheetDescription></SheetHeader>{!isDesktop ? panel:null}</SheetContent></Sheet></div>
}
