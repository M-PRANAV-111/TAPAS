import rawSnapshot from '@/data/heat-snapshot.json'
import grid from '@/data/national-grid.json'
import mask from '@/data/india-land-mask.json'
import {ApiError,record,numberOrNull,safeHttpUrl,validatedRequest} from '@/lib/api'
import type {DataProvenance} from '@/lib/types'
import {todayIso,toIsoDate} from '@/lib/utils'
import {heatIndexCelsius} from '@/lib/thermal'
export type Bounds=[number,number,number,number]
export interface HeatPoint {id:string;name:string;latitude:number;longitude:number;time:string;temperature:number|null;humidity:number|null;apparent:number|null;wind:number|null;heatIndex:number|null}
export interface HeatGrid {points:HeatPoint[];provenance:DataProvenance;date:string}
export interface GridRequest {latitude:number;longitude:number;name:string}
export const NATIONAL_BOUNDS:Bounds=[68,6,98,38]
export function onIndiaLand(lon:number,lat:number){
 const ring=mask.geometry.coordinates[0] as number[][];let inside=false
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside}
 return inside
}
export function viewportKey(bounds:Bounds,zoom:number){const digits=zoom<=5?0:zoom<10?1:2;return zoom<=5?'national':`${zoom<10?'regional':'city'}:${bounds.map(v=>v.toFixed(digits)).join(',')}`}
export function viewportPoints(bounds:Bounds,zoom:number):GridRequest[]{
 if(zoom<=5)return grid
 const [w,s,e,n]=bounds,columns=zoom<10?8:5,rows=5,result:GridRequest[]=[]
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const longitude=Number((w+(e-w)*(col+.5)/columns).toFixed(4)),latitude=Number((s+(n-s)*(row+.5)/rows).toFixed(4))
  if(onIndiaLand(longitude,latitude))result.push({longitude,latitude,name:`Weather point ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`})
 }
 return result
}
export function parseHeatPoint(payload:unknown,request:GridRequest,date:string,snapshot=false):HeatPoint|null{
 const r=record(payload),lat=numberOrNull(r.latitude),lon=numberOrNull(r.longitude)
 if(lat===null||lon===null||Math.abs(lat-request.latitude)>.5||Math.abs(lon-request.longitude)>.5||r.utc_offset_seconds!==19800)throw new ApiError('Weather point identity mismatch.',undefined,undefined,'invalid')
 let row:Record<string,unknown>|null=null,units:Record<string,unknown>|null=null
 const current=r.current?record(r.current):null
 if(current&&typeof current.time==='number'&&(snapshot||toIsoDate(new Date(current.time*1000))===date)&&date===todayIso()){row=current;units=record(r.current_units)}
 else if(r.hourly){const h=record(r.hourly);if(!Array.isArray(h.time))throw new ApiError('Malformed weather times.',undefined,undefined,'invalid');let i=h.time.findIndex(t=>typeof t==='number'&&toIsoDate(new Date(t*1000))===date&&new Date(t*1000+19800000).getUTCHours()===12);if(i<0&&snapshot)i=0;if(i>=0){row=Object.fromEntries(Object.entries(h).map(([k,v])=>[k,Array.isArray(v)?v[i]:null]));units=record(r.hourly_units)}}
 if(!row&&snapshot&&current){row=current;units=record(r.current_units)}
 if(!row||!units)return null
 if(units.time!=='unixtime'||units.temperature_2m!=='°C'||units.relative_humidity_2m!=='%'||units.apparent_temperature!=='°C'||typeof row.time!=='number'||!Number.isFinite(row.time))throw new ApiError('Malformed weather units.',undefined,undefined,'invalid')
 const temperature=numberOrNull(row.temperature_2m,-100,70),humidity=numberOrNull(row.relative_humidity_2m,0,100)
 return {id:`${request.latitude},${request.longitude}`,name:request.name.startsWith('Weather point')?`Weather point ${lat.toFixed(3)}, ${lon.toFixed(3)}`:request.name,latitude:lat,longitude:lon,time:new Date(row.time*1000).toISOString(),temperature,humidity,apparent:numberOrNull(row.apparent_temperature,-120,120),wind:units.wind_speed_10m==='m/s'?numberOrNull(row.wind_speed_10m,0,150):null,heatIndex:heatIndexCelsius(temperature,humidity)}
}
export function snapshotGrid(bounds:Bounds=NATIONAL_BOUNDS,zoom=3,date=todayIso()):HeatGrid|undefined{
 const points:HeatPoint[]=[]
 for(const group of rawSnapshot.recordings)for(let i=0;i<group.requests.length;i++){
  const p=group.requests[i]
  if(zoom<=5?!p.name.startsWith('Grid '):p.longitude<bounds[0]||p.longitude>bounds[2]||p.latitude<bounds[1]||p.latitude>bounds[3])continue
  const point=parseHeatPoint(group.data[i],p,date,true);if(point)points.push(point)
 }
 if(!points.length)return undefined
 return {points,date,provenance:{status:'snapshot',source:rawSnapshot.provider,issuedAt:null,originalAt:points[0].time,fetchedAt:rawSnapshot.recordings[0].capturedAt,fromCache:false,geographicId:`snapshot:${viewportKey(bounds,zoom)}`,validUntil:null,note:'Recorded weather points at their original coordinates; not current conditions. Select a point to inspect its valid time.'}}
}
export async function fetchHeatGrid(bounds:Bounds,zoom:number,date:string,signal?:AbortSignal):Promise<HeatGrid>{
 const requests=viewportPoints(bounds,zoom),key=viewportKey(bounds,zoom)
 if(!requests.length)throw new ApiError('No land sampling points in this viewport.',undefined,undefined,'no-coverage')
 try{
  const groups=[];for(let i=0;i<requests.length;i+=40)groups.push(requests.slice(i,i+40))
  const results=await Promise.all(groups.map(async group=>{
   const url=safeHttpUrl(process.env.NEXT_PUBLIC_WEATHER_URL||'https://api.open-meteo.com/v1/forecast')
   const fields='temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,cloud_cover'
   for(const [k,v]of Object.entries({latitude:group.map(p=>p.latitude).join(','),longitude:group.map(p=>p.longitude).join(','),current:fields,hourly:fields+',shortwave_radiation,direct_radiation',start_date:date,end_date:date,timezone:'Asia/Kolkata',timeformat:'unixtime',wind_speed_unit:'ms'}))url.searchParams.set(k,v)
   return validatedRequest(url,(payload,fetchedAt,cached)=>{
    const rows=Array.isArray(payload)?payload:[payload];if(rows.length!==group.length)throw new ApiError('Weather batch count mismatch.',undefined,undefined,'invalid')
    const points=rows.map((row,i)=>parseHeatPoint(row,group[i],date)).filter((p):p is HeatPoint=>!!p)
    return {points,date,provenance:{status:cached?'cached' as const:'live' as const,source:'Open-Meteo best-match weather models',issuedAt:null,originalAt:points[0]?.time??null,fetchedAt,fromCache:cached,geographicId:key,validUntil:null}}
   },signal)
  }))
  const points=[...new Map(results.flatMap(r=>r.points).map(p=>[`${p.latitude},${p.longitude},${p.time}`,p])).values()];if(!points.length)throw new ApiError('No valid weather samples.',undefined,undefined,'no-coverage')
  return {points,date,provenance:{...results[0].provenance,status:results.some(r=>r.provenance.fromCache)?'cached':'live',fromCache:results.some(r=>r.provenance.fromCache)}}
 }catch(error){if(signal?.aborted)throw error;const saved=snapshotGrid(bounds,zoom,date);if(saved)return saved;throw error}
}
export function nearestSnapshot(location:{latitude:number;longitude:number},date:string){
 let best:{request:GridRequest;payload:unknown;capturedAt:string;distance:number}|undefined
 for(const group of rawSnapshot.recordings)for(let i=0;i<group.requests.length;i++){const p=group.requests[i],raw=group.data[i],distance=Math.hypot((raw.longitude-location.longitude)*Math.cos(location.latitude*Math.PI/180),raw.latitude-location.latitude)*111.2;if(distance<=10&&(!best||distance<best.distance))best={request:p,payload:group.data[i],capturedAt:group.capturedAt,distance}}
 if(!best)return undefined
 return {...best,point:parseHeatPoint(best.payload,best.request,date,true)}
}
