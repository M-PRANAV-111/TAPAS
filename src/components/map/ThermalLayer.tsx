'use client'
import {useEffect,useMemo,useState,useRef} from 'react'
import {useOnlineStatus} from '@/hooks/useOnlineStatus'
import {useQuery} from '@tanstack/react-query'
import maplibregl,{type Map as MapLibreMap,type GeoJSONSource,type MapLayerMouseEvent} from 'maplibre-gl'
import {DataProvenance} from '@/components/data/DataProvenance'
import {fetchHeatGrid,snapshotGrid,viewportKey,NATIONAL_BOUNDS,type Bounds,type HeatPoint} from '@/lib/heatGrid'
import {formatHeatIndex,heatIndexBand} from '@/lib/thermal'
import {formatDateTime,formatTemp} from '@/lib/utils'
import {useLocation} from '@/components/providers/LocationProvider'
import {coordinateLocation} from '@/lib/location'
const EMPTY_POINTS:HeatPoint[]=[]
export function ThermalLayer({map,date}:{map:MapLibreMap|null;date:string}){
 const overlay=useRef<HTMLDivElement>(null)
 const {selectLocation}=useLocation()
 const [viewport,setViewport]=useState<{bounds:Bounds;zoom:number}>({bounds:NATIONAL_BOUNDS,zoom:3.5}),[metric,setMetric]=useState<'heatIndex'|'temperature'>('heatIndex')
 const key=viewportKey(viewport.bounds,viewport.zoom)
 const initial=useMemo(()=>snapshotGrid(viewport.bounds,viewport.zoom,date),[key,date]) // eslint-disable-line react-hooks/exhaustive-deps
 const query=useQuery({queryKey:['heat-grid',key,date],queryFn:({signal})=>fetchHeatGrid(viewport.bounds,viewport.zoom,date,signal),initialData:initial,initialDataUpdatedAt:0,staleTime:15*60_000,gcTime:30*60_000,retry:false})
 const online=useOnlineStatus()
 const data=query.data,points=data?.points??EMPTY_POINTS,status=data?.provenance.status==='snapshot'?'snapshot':data&&(query.error||!online||data.provenance.fromCache)?'cached':data?.provenance.status??'unavailable'
 useEffect(()=>{
  if(!map)return
  let timer:ReturnType<typeof setTimeout>
  const update=()=>{clearTimeout(timer);timer=setTimeout(()=>{const b=map.getBounds();setViewport({bounds:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],zoom:map.getZoom()})},500)}
  map.on('moveend',update);update()
  return()=>{clearTimeout(timer);map.off('moveend',update)}
 },[map])
 useEffect(()=>{
  if(!map)return
  if(!map.getSource('thermal-points')){
   map.addSource('thermal-points',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
   map.addLayer({id:'thermal-circles',type:'circle',source:'thermal-points',paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,7,6,12,12,19],'circle-color':['get','color'],'circle-opacity':.85,'circle-stroke-color':'#F4E4CC','circle-stroke-width':1.5}})
  }
  const features=points.map(p=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[p.longitude,p.latitude]},properties:{id:p.id,color:metric==='heatIndex'?(heatIndexBand(p.heatIndex)?.color??'#6B5D4F'):p.temperature===null?'#6B5D4F':p.temperature>=40?'#741E29':p.temperature>=35?'#D3443F':p.temperature>=30?'#EA762B':p.temperature>=25?'#D4AC0D':'#2471A3'}}))
  ;(map.getSource('thermal-points') as GeoJSONSource).setData({type:'FeatureCollection',features})
  return()=>{}
 },[map,points,metric])
 useEffect(()=>{
  if(!map)return
  let popup:maplibregl.Popup|null=null
  const click=(event:MapLayerMouseEvent)=>{const p=points.find(p=>p.id===event.features?.[0]?.properties?.id);if(!p)return;const content=document.createElement('div');content.textContent=`${p.name}: Heat Index ${formatHeatIndex(p.heatIndex)}; air ${formatTemp(p.temperature)}. ${status.toUpperCase()} · ${formatDateTime(p.time)} · ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`;popup?.remove();popup=new maplibregl.Popup().setLngLat([p.longitude,p.latitude]).setDOMContent(content).addTo(map)}
  map.on('click','thermal-circles',click)
  return()=>{map.off('click','thermal-circles',click);popup?.remove()}
 },[map,points,status])
 useEffect(()=>{if(!map)return;const inspect=()=>{if(map.getLayer('thermal-circles')&&overlay.current)overlay.current.dataset.renderedPoints=String(map.queryRenderedFeatures({layers:['thermal-circles']}).length)};map.on('render',inspect);return()=>{map.off('render',inspect)}},[map])
 const select=(p:HeatPoint)=>selectLocation({...coordinateLocation(p.latitude,p.longitude),name:p.name,source:'Open-Meteo sampled point'})
 return <div ref={overlay} className="relative z-10 shrink-0 border-t bg-card p-3" data-testid="heat-layer" data-point-count={points.length} data-status={status}><div className="flex flex-wrap items-center justify-between gap-x-3"><h2 className="text-xs font-semibold">{points.length} weather-model points</h2><label className="flex min-h-11 items-center gap-2 text-xs">Heat metric<select aria-label="Heat metric" className="min-h-11 max-w-[140px] rounded border bg-card p-2" value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}><option value="heatIndex">Heat Index</option><option value="temperature">Air temperature</option></select></label></div><DataProvenance status={status} source={data?.provenance.source} timestamp={data?.provenance.originalAt} note={data?.provenance.status==='snapshot'?'Recorded model sample; original dates are shown. Live refresh pending or unavailable.':query.isFetching?'Refreshing the selected viewport…':undefined}/><p className="mt-1 text-[11px] tapas-subtext">{metric==='heatIndex'?'Gold: caution · orange: extreme caution · red: danger · dark red: extreme danger · grey: HI unavailable. Shade/light wind; not an official warning.':'Blue <25°C · gold 25–30°C · orange 30–35°C · red 35–40°C · dark red ≥40°C. Temperature colours are not official risk categories.'}</p>{!points.length?<p role="status" className="mt-1 text-xs">No live, cached or recorded weather points for this viewport. Zoom out to the recorded India grid.</p>:null}<button className="min-h-11 text-xs underline" onClick={()=>{if(map&&points.length){const b=new maplibregl.LngLatBounds();points.forEach(p=>b.extend([p.longitude,p.latitude]));map.fitBounds(b,{padding:{top:110,bottom:25,left:25,right:25},maxZoom:10,duration:0})}}}>Fit returned model points</button><details className="text-xs"><summary className="flex min-h-11 cursor-pointer items-center py-1">Inspect model points</summary><ul className="max-h-28 overflow-y-auto">{points.map(p=><li key={p.id}><button className="min-h-11 text-left underline" onClick={()=>select(p)}>{p.name}: {formatTemp(p.temperature)}, HI {formatHeatIndex(p.heatIndex)} · {formatDateTime(p.time)}</button></li>)}</ul></details></div>
}
