'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {type Map as MapLibreMap, type StyleSpecification, type GeoJSONSource, type MapLayerMouseEvent} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ThermalLayer } from '@/components/map/ThermalLayer'
import { WardLayer, bboxOf } from '@/components/map/WardLayer'
import { RISK_LABELS } from '@/lib/constants'
import { locationKey, type SelectedLocation } from '@/lib/location'
import type { SafetyResource } from '@/lib/resources'
import type { WardCollection, WardRisk } from '@/lib/types'
import { cn } from '@/lib/utils'
const EMPTY: WardCollection = {type:'FeatureCollection',features:[]}
const BASE_STYLE: StyleSpecification = {version:8,sources:{osm:{type:'raster',tiles:[process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
export interface HeatMapProps {geojson?:WardCollection;wards:WardRisk[];selectedWardId:string|null;onWardSelect:(id:string)=>void;location:SelectedLocation|null;resources?:SafetyResource[];selectedResourceId?:string|null;onResourceSelect?:(resource:SafetyResource)=>void;className?:string;selectedDate:string}
export default function HeatMap({geojson,wards,selectedWardId,onWardSelect,location,resources=[],selectedResourceId,onResourceSelect,className,selectedDate}:HeatMapProps) {
  const container=useRef<HTMLDivElement>(null), instanceRef=useRef<MapLibreMap|null>(null)
  const [map,setMap]=useState<MapLibreMap|null>(null), [error,setError]=useState<string|null>(null), [riskVisible,setRiskVisible]=useState(true), [resourcesVisible,setResourcesVisible]=useState(true)
  const risks=useMemo(()=>new Map(wards.map(w=>[w.ward_id,w])),[wards]), key=locationKey(location)
  useEffect(()=>{
    if (!container.current || instanceRef.current) return
    let instance: MapLibreMap
    try {instance=new maplibregl.Map({container:container.current,style:BASE_STYLE,center:[80.5,22],zoom:3.5,attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false})} catch {setError('Interactive map unavailable on this device. Use the place, ward and nearby-help lists.');return}
    instanceRef.current=instance
    instance.touchZoomRotate.disableRotation();instance.keyboard.disableRotation();instance.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right')
    instance.once('style.load',()=>setMap(instance))
    instance.on('error',event=>{if(event.error.message.includes('WebGL')) setError('Map rendering failed. The accessible lists remain available.')})
    const observer=new ResizeObserver(()=>instance.resize());observer.observe(container.current)
    return ()=>{observer.disconnect();instance.remove();instanceRef.current=null}
  },[])
  useEffect(()=>{
    if (!map) return
    if(!location){map.jumpTo({center:[80.5,22],zoom:3.5});return}
    const marker=new maplibregl.Marker({color:'#1C2833'}).setLngLat([location.longitude,location.latitude]).addTo(map)
    marker.getElement().setAttribute('aria-label',`Selected location: ${location.name}`)
    if(location.bounds) map.fitBounds(location.bounds,{padding:40,maxZoom:10,duration:0})
    else map.jumpTo({center:[location.longitude,location.latitude],zoom:10})
    return ()=>{marker.remove()}
  // Coordinate identity controls recentering; reverse geocoding must not move the map.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[map,key])
  useEffect(()=>{
    if(!map || !geojson || !selectedWardId)return
    const f=geojson.features.find(f=>f.properties.ward_id===selectedWardId), bounds=f ? bboxOf([f]):null
    if(bounds)map.fitBounds(bounds,{padding:40,maxZoom:14,duration:0})
  },[map,geojson,selectedWardId])
  useEffect(()=>{
    if(!map)return
    if(!map.getSource('help')) {
      map.addSource('help',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterMaxZoom:13,clusterRadius:35})
      map.addLayer({id:'help-clusters',type:'circle',source:'help',filter:['has','point_count'],paint:{'circle-color':'#1C596B','circle-radius':17,'circle-stroke-color':'#FFFFFF','circle-stroke-width':2}})
      map.addLayer({id:'help-points',type:'circle',source:'help',filter:['!', ['has','point_count']],paint:{'circle-color':['match',['get','category'],'water','#2471A3','medical','#884EA0','#1C596B'],'circle-radius':['case',['==',['get','id'],selectedResourceId ?? ''],10,7],'circle-stroke-color':'#FFFFFF','circle-stroke-width':2}})
    }
    const source=map.getSource('help') as GeoJSONSource
    source.setData({type:'FeatureCollection',features:(resourcesVisible?resources:[]).map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[r.longitude,r.latitude]},properties:{id:r.id,category:r.category,name:r.name}}))})
    map.setPaintProperty('help-points','circle-radius',['case',['==',['get','id'],selectedResourceId ?? ''],10,7])
  },[map,resources,resourcesVisible,selectedResourceId])
  useEffect(()=>{
    if(!map)return
    const click=(event:MapLayerMouseEvent)=>{const resource=resources.find(r=>r.id===event.features?.[0]?.properties?.id);if(resource)onResourceSelect?.(resource)}
    const cluster=(event:MapLayerMouseEvent)=>{const f=event.features?.[0];if(!f || f.geometry.type!=='Point')return; const center=f.geometry.coordinates as [number,number];void (map.getSource('help') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id)).then(zoom=>{if(instanceRef.current===map)map.easeTo({center,zoom,duration:0})}).catch(()=>{})}
    map.on('click','help-points',click);map.on('click','help-clusters',cluster)
    return()=>{map.off('click','help-points',click);map.off('click','help-clusters',cluster)}
  },[map,resources,onResourceSelect])
  useEffect(()=>{
    const resource=resources.find(r=>r.id===selectedResourceId)
    if(!map || !resource || !resourcesVisible)return
    map.easeTo({center:[resource.longitude,resource.latitude],zoom:15,duration:0})
    const content=document.createElement('div');content.textContent=`${resource.name} · ${resource.category} · availability unconfirmed`;content.className='text-xs'
    const popup=new maplibregl.Popup({offset:10}).setLngLat([resource.longitude,resource.latitude]).setDOMContent(content).addTo(map)
    return()=>{popup.remove()}
  },[map,resources,selectedResourceId,resourcesVisible])
  return <div id="heat-map" data-testid="heat-map" className={cn('relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-secondary',className)}><div className="relative min-h-0 flex-1"><div ref={container} className="h-full w-full" aria-label={`Map for ${location?.name ?? 'India'}`} /><div className="absolute left-2 top-2 z-10 max-w-[calc(100%-4rem)] rounded-md border bg-white/95 p-2 text-xs shadow-sm"><p className="font-semibold">{location?.name ?? 'India · choose a place'}</p><p className="mt-1 hidden tapas-subtext sm:block">{selectedDate} · {geojson?.features.length ? 'Regional boundaries loaded' : 'Weather heat layer independent of ward coverage'}</p><div className="mt-1 flex flex-wrap gap-x-3"><label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={riskVisible} onChange={e=>setRiskVisible(e.target.checked)}/>Ward layer</label><label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={resourcesVisible} onChange={e=>setResourcesVisible(e.target.checked)}/>Nearby help ({resources.length})</label></div></div>{error ? <p role="status" className="absolute inset-x-2 bottom-12 rounded-md border bg-white p-3 text-sm">{error}</p>:null}<ul className="sr-only" data-testid="ward-risk-list">{wards.map(w=><li key={w.ward_id} data-ward-id={w.ward_id}>{w.ward_name} — {w.risk_level ? `Level ${w.risk_level} ${RISK_LABELS[w.risk_level]}`:'Risk unavailable'}</li>)}</ul></div><ThermalLayer map={map} date={selectedDate}/>{map ? <WardLayer map={map} geojson={riskVisible ? geojson ?? EMPTY : EMPTY} risks={risks} selectedWardId={selectedWardId} onWardSelect={onWardSelect}/>:null}</div>
}
