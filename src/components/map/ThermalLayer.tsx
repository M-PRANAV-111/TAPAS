'use client'
import {useEffect,useMemo,useState,useRef} from 'react'
import {useOnlineStatus} from '@/hooks/useOnlineStatus'
import {useQuery} from '@tanstack/react-query'
import maplibregl,{type Map as MapLibreMap,type GeoJSONSource,type MapLayerMouseEvent} from 'maplibre-gl'
import {DataProvenance} from '@/components/data/DataProvenance'
import {fetchHeatGrid,snapshotGrid,viewportKey,NATIONAL_BOUNDS,type Bounds,type HeatPoint} from '@/lib/heatGrid'
import {formatHeatIndex,heatIndexBand} from '@/lib/thermal'
import {formatDateTime,formatTemp,cn} from '@/lib/utils'
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
  const click=(event:MapLayerMouseEvent)=>{
    const p=points.find(p=>p.id===event.features?.[0]?.properties?.id)
    if(!p)return
    const name=(p.name||'Weather point').replace(/[<>&]/g,'')
    const latFormatted=`${Math.abs(p.latitude).toFixed(3)}° ${p.latitude>=0?'N':'S'}`
    const lonFormatted=`${Math.abs(p.longitude).toFixed(3)}° ${p.longitude>=0?'E':'W'}`
    const coords=`${latFormatted}, ${lonFormatted}`
    const band=heatIndexBand(p.heatIndex)
    const bandColor=band?.color??'#C4A986'
    const bandLabel=band?.label?band.label.toUpperCase():'CAUTION'
    const timeFormatted=formatDateTime(p.time)

    const feelsLikeSection=p.heatIndex!==null&&typeof p.heatIndex==='number'
      ? `<div style="padding:10px 14px;border-bottom:1px solid var(--line-hair)">
           <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-low)">FEELS LIKE</div>
           <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:2px">
             <span style="font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;color:${bandColor};letter-spacing:-0.025em">${p.heatIndex.toFixed(1)} °C</span>
             <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:2px 7px;border-radius:4px;background:rgba(226,114,42,0.12);color:${bandColor}">${bandLabel}</span>
           </div>
         </div>`
      : `<div style="padding:10px 14px;border-bottom:1px solid var(--line-hair)">
           <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-low)">FEELS LIKE</div>
           <div style="margin-top:4px;font-size:11px;line-height:1.4;color:var(--ink-mid)">Heat Index not defined below 27 °C. This does not mean conditions are safe.</div>
         </div>`

    const html=`<div style="font-family:var(--font);color:var(--ink-mid);background:var(--surface-3);width:250px;font-size:12px;border-radius:10px;overflow:hidden">
      <div style="padding:10px 14px 8px;border-bottom:1px solid var(--line-hair)">
        <div style="font-size:13px;font-weight:700;color:var(--ink-high);line-height:1.2">${name}</div>
        <div style="font-size:10.5px;color:var(--ink-low);margin-top:2px;font-variant-numeric:tabular-nums">${coords}</div>
      </div>
      ${feelsLikeSection}
      <div style="padding:8px 14px;border-bottom:1px solid var(--line-hair);font-size:11.5px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="color:var(--ink-low)">Air temperature</span>
          <span style="font-weight:600;color:var(--ink-high);font-variant-numeric:tabular-nums">${p.temperature!=null?formatTemp(p.temperature):'Unavailable'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="color:var(--ink-low)">Relative humidity</span>
          <span style="font-weight:600;color:var(--ink-high);font-variant-numeric:tabular-nums">${p.humidity!=null?`${p.humidity} %`:'Unavailable'}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--ink-low)">Wind</span>
          <span style="font-weight:600;color:var(--ink-high);font-variant-numeric:tabular-nums">${p.wind!=null?`${p.wind.toFixed(1)} m/s`:'Unavailable'}</span>
        </div>
      </div>
      <div style="padding:8px 14px;font-size:10px;color:var(--ink-low);background:var(--surface-2)">
        <div style="display:flex;align-items:center;gap:5px;font-weight:600;color:var(--accent)">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent)"></span>
          ● LIVE · ${timeFormatted}
        </div>
        <div style="margin-top:2px;color:var(--ink-faint)">Open-Meteo · ECMWF model</div>
      </div>
    </div>`

    popup?.remove()
    popup=new maplibregl.Popup({maxWidth:'260px'}).setLngLat([p.longitude,p.latitude]).setHTML(html).addTo(map)
  }
  map.on('click','thermal-circles',click)
  return()=>{map.off('click','thermal-circles',click);popup?.remove()}
 },[map,points,status])
 useEffect(()=>{if(!map)return;const inspect=()=>{if(map.getLayer('thermal-circles')&&overlay.current)overlay.current.dataset.renderedPoints=String(map.queryRenderedFeatures({layers:['thermal-circles']}).length)};map.on('render',inspect);return()=>{map.off('render',inspect)}},[map])
 const select=(p:HeatPoint)=>selectLocation({...coordinateLocation(p.latitude,p.longitude),name:p.name,source:'Open-Meteo sampled point'})
 return <div ref={overlay} className="relative z-10 shrink-0 border-t border-[var(--line-soft)] bg-[var(--surface-1)] p-3.5" data-testid="heat-layer" data-point-count={points.length} data-status={status}><div className="flex flex-wrap items-center justify-between gap-x-3"><h2 className="text-xs font-semibold text-[var(--ink-high)]">{points.length} weather-model points</h2><div className="flex items-center gap-1 text-xs"><span className="text-[var(--ink-low)] text-[11px] uppercase tracking-wider font-semibold">Heat metric</span><div className="inline-flex rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] p-0.5"><button type="button" onClick={()=>setMetric('heatIndex')} className={cn("px-2.5 py-1 text-xs font-medium rounded-md transition-colors", metric==='heatIndex' ? "bg-[var(--surface-3)] text-[var(--ink-high)] shadow-sm" : "text-[var(--ink-low)] hover:text-[var(--ink-mid)]")}>Heat Index</button><button type="button" onClick={()=>setMetric('temperature')} className={cn("px-2.5 py-1 text-xs font-medium rounded-md transition-colors", metric==='temperature' ? "bg-[var(--surface-3)] text-[var(--ink-high)] shadow-sm" : "text-[var(--ink-low)] hover:text-[var(--ink-mid)]")}>Air temp</button></div></div></div><DataProvenance status={status} source={data?.provenance.source} timestamp={data?.provenance.originalAt} note={data?.provenance.status==='snapshot'?'Recorded model sample; original dates are shown. Live refresh pending or unavailable.':query.isFetching?'Refreshing the selected viewport…':undefined}/><p className="mt-1 text-[11px] text-[var(--ink-low)]">{metric==='heatIndex'?'Gold: caution · orange: extreme caution · red: danger · dark red: extreme danger · grey: HI unavailable. Shade/light wind; not an official warning.':'Blue <25°C · gold 25–30°C · orange 30–35°C · red 35–40°C · dark red ≥40°C. Temperature colours are not official risk categories.'}</p>{!points.length?<p role="status" className="mt-1 text-xs text-[var(--ink-low)]">No live, cached or recorded weather points for this viewport. Zoom out to the recorded India grid.</p>:null}<button className="min-h-11 text-xs underline text-[var(--accent)] hover:text-[var(--ink-high)]" onClick={()=>{if(map&&points.length){const b=new maplibregl.LngLatBounds();points.forEach(p=>b.extend([p.longitude,p.latitude]));map.fitBounds(b,{padding:{top:110,bottom:25,left:25,right:25},maxZoom:10,duration:0})}}}>Fit returned model points</button><details className="text-xs text-[var(--ink-mid)]"><summary className="flex min-h-11 cursor-pointer items-center py-1 text-[var(--ink-low)] hover:text-[var(--ink-high)]">Inspect model points</summary><ul className="max-h-28 overflow-y-auto">{points.map(p=><li key={p.id}><button className="min-h-11 text-left underline text-[var(--ink-mid)] hover:text-[var(--accent)]" onClick={()=>select(p)}>{p.name}: {formatTemp(p.temperature)}, HI {formatHeatIndex(p.heatIndex)} · {formatDateTime(p.time)}</button></li>)}</ul></details></div>
}
