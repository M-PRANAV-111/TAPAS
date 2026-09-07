import poiSnapshot from '@/data/poi-snapshot.json'
import type { SelectedLocation } from '@/lib/location'

export type ResourceCategory = 'all' | 'cooling' | 'water' | 'medical' | 'shelter' | 'emergency' | 'misting'
export interface SafetyResource {
  id: string
  name: string
  category: Exclude<ResourceCategory, 'all'>
  latitude: number
  longitude: number
  distanceKm: number
  address?: string
  phone?: string
  source: string
  sourceUrl: string
  dataTimestamp?: string
  verifiedAt?: string
  openingHours?: string
  accessibility?: string
  emergencyDepartment?: boolean
  verification: 'community-mapped' | 'authority-listed'
}
export interface ResourceResult {
  status?:'live'|'cached'|'snapshot'
  originalAt?:string
  note?:string
  resources: SafetyResource[]
  fetchedAt: string
  source: string
  limitations: string[]
  unavailableCategories: ResourceCategory[]
}

export const RESOURCE_RADIUS_KM = 3
export const RESOURCE_LIMIT = 40
export const RESOURCE_LABELS: Record<ResourceCategory, string> = {
  all: 'All', cooling: 'Cooling', water: 'Water', medical: 'Medical',
  shelter: 'Shelter', emergency: 'Emergency', misting: 'Misting',
}
export const OVERPASS_URL = process.env.NEXT_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter'
const OFFICIAL_RESOURCES_URL = process.env.NEXT_PUBLIC_OFFICIAL_RESOURCES_URL
type RecordValue = Record<string, unknown>
const object = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const string = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim().slice(0, 1000) : undefined

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}
export function distanceKm(a: Pick<SelectedLocation, 'latitude' | 'longitude'>, b: Pick<SelectedLocation, 'latitude' | 'longitude'>): number {
  if (!validCoordinates(a.latitude, a.longitude) || !validCoordinates(b.latitude, b.longitude)) return NaN
  const rad = Math.PI / 180
  const haversine = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))))
}
export function safeHttpUrl(value: unknown): string | undefined {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
export function officialSourceUrl(value: unknown): string | undefined {
  const url = safeHttpUrl(value)
  if (!url) return undefined
  const host = new URL(url).hostname
  return /(^|\.)(gov\.in|nic\.in)$/.test(host) ? url : undefined
}
export function validPastTimestamp(value: unknown, now = Date.now()): string | undefined {
  const text = string(value)
  if (!text || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) return undefined
  const time = Date.parse(text)
  return Number.isFinite(time) && time <= now ? text : undefined
}
export function phoneHref(value: string | undefined): string | undefined {
  if (!value || !/^\+?[\d ()-]{5,30}$/.test(value)) return undefined
  const digits = value.replace(/[ ()-]/g, '')
  return /^\+?\d{5,15}$/.test(digits) ? `tel:${digits}` : undefined
}
export function directionsUrl(resource: SafetyResource, origin?: Pick<SelectedLocation, 'latitude' | 'longitude'>): string | undefined {
  if (!validCoordinates(resource.latitude, resource.longitude)) return undefined
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('destination', `${resource.latitude},${resource.longitude}`)
  if (origin && validCoordinates(origin.latitude, origin.longitude)) url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`)
  return url.href
}
export function filterResources(resources: SafetyResource[], category: ResourceCategory): SafetyResource[] {
  return resources.filter(resource => validCoordinates(resource.latitude, resource.longitude) && Number.isFinite(resource.distanceKm) && resource.distanceKm >= 0 && (category === 'all' || resource.category === category || (category === 'emergency' && resource.category === 'medical' && resource.emergencyDepartment === true))).sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Community mapping identifies POIs; it does not verify opening or water availability. */
export function parseOverpass(payload: unknown, location: SelectedLocation): SafetyResource[] {
  const envelope = object(payload)
  if (!Array.isArray(envelope.elements) || envelope.remark) throw new Error('The map provider returned incomplete or malformed resource data.')
  const result = new Map<string, SafetyResource>()
  for (const value of envelope.elements.slice(0, RESOURCE_LIMIT)) {
    const element = object(value)
    const tags = object(element.tags)
    const center = object(element.center)
    const latitude = element.lat ?? center.lat
    const longitude = element.lon ?? center.lon
    if (!validCoordinates(latitude, longitude) || !['node', 'way', 'relation'].includes(String(element.type)) || typeof element.id !== 'number' || !Number.isSafeInteger(element.id)) continue
    if (['private', 'no'].includes(String(tags.access)) || tags.disused === 'yes' || tags.abandoned === 'yes') continue
    const medical = ['hospital', 'clinic', 'doctors'].includes(String(tags.amenity)) || ['hospital', 'clinic', 'doctor'].includes(String(tags.healthcare))
    const water = (tags.amenity === 'drinking_water' || (tags.amenity === 'water_point' && tags.drinking_water === 'yes') || tags.drinking_water === 'yes') && tags.drinking_water !== 'no'
    if (!medical && !water) continue
    const category = medical ? 'medical' : 'water'
    const coordinates = { latitude: latitude as number, longitude: longitude as number }
    const distance = distanceKm(location, coordinates)
    if (distance > RESOURCE_RADIUS_KM) continue
    const id = `osm-${element.type}-${element.id}`
    const address = ['addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city', 'addr:postcode'].map(key => string(tags[key])).filter(Boolean).join(', ')
    const phone = string(tags.phone ?? tags['contact:phone'])
    result.set(id, {
      id, name: string(tags.name ?? tags['name:en']) || (medical ? 'Unnamed mapped medical facility' : 'Unnamed mapped drinking-water point'),
      category, ...coordinates, distanceKm: distance, address: address || undefined,
      phone: phoneHref(phone) ? phone : undefined,
      source: 'OpenStreetMap contributors', sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      dataTimestamp: validPastTimestamp(element.timestamp),
      openingHours: string(tags.opening_hours), accessibility: string(tags.wheelchair),
      emergencyDepartment: tags.emergency === 'yes' ? true : undefined,
      verification: 'community-mapped',
    })
  }
  return filterResources([...result.values()], 'all')
}

/** Deployment-managed, sourced authority records. No temporary relief POI is inferred from OSM. */
export function parseOfficialResources(payload: unknown, location: SelectedLocation): SafetyResource[] {
  const envelope = object(payload)
  if (!Array.isArray(envelope.resources) || envelope.resources.length > 1000) throw new Error('Official resource data is malformed or exceeds the regional limit.')
  const resources: SafetyResource[] = []
  for (const value of envelope.resources) {
    const row = object(value)
    const id = string(row.id), name = string(row.name), source = string(row.authority), sourceUrl = officialSourceUrl(row.sourceUrl)
    const category = string(row.category) as SafetyResource['category'] | undefined
    if (!id || !name || !source || !sourceUrl || !category || category === ('all' as ResourceCategory) || !(category in RESOURCE_LABELS) || !validCoordinates(row.latitude, row.longitude)) continue
    if (row.countryCode !== 'IN') continue
    const coordinates = { latitude: row.latitude as number, longitude: row.longitude as number }
    const distance = distanceKm(location, coordinates)
    if (distance > RESOURCE_RADIUS_KM) continue
    const validUntil = string(row.validUntil)
    if (validUntil && (!Number.isFinite(Date.parse(validUntil)) || Date.parse(validUntil) <= Date.now())) continue
    const phone = string(row.phone)
    resources.push({
      id: `official-${id}`, name, category, ...coordinates, distanceKm: distance,
      address: string(row.address), phone: phoneHref(phone) ? phone : undefined,
      source, sourceUrl, dataTimestamp: validPastTimestamp(row.dataTimestamp), verifiedAt: validPastTimestamp(row.verifiedAt),
      openingHours: string(row.openingHours), accessibility: string(row.accessibility),
      emergencyDepartment: row.emergencyDepartment === true ? true : undefined,
      verification: 'authority-listed',
    })
  }
  return filterResources(resources, 'all')
}

export async function resourceJson(url: string, signal: AbortSignal, init?: RequestInit): Promise<unknown> {
  if (!safeHttpUrl(url) && !/^\/(?!\/)/.test(url)) throw new Error('Resource provider needs an HTTPS or same-origin URL.')
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  if (signal.aborted) abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException('Resource request timed out.', 'TimeoutError')), 25000)
  try {
    const response = await fetch(url, { ...init, credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(response.status === 429 ? 'The resource provider is busy. Wait before trying again.' : `Resource provider unavailable (HTTP ${response.status}).`)
    const text = await response.text()
    if (text.length > 3_000_000) throw new Error('Resource response exceeds the regional size limit.')
    try { return JSON.parse(text) as unknown } catch { throw new Error('The resource provider returned an unreadable response. Try again later.') }
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted) throw new Error('Nearby resource request timed out. Try again later.')
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}
async function fetchResourcesLive(location: SelectedLocation, signal: AbortSignal): Promise<ResourceResult> {
  if (!validCoordinates(location.latitude, location.longitude)) throw new Error('Select a place with valid coordinates.')
  const around = `(around:${RESOURCE_RADIUS_KM * 1000},${location.latitude.toFixed(6)},${location.longitude.toFixed(6)})`
  const query = `[out:json][timeout:20][maxsize:33554432];(nwr[amenity~"^(hospital|clinic|doctors|drinking_water)$"]${around};nwr[healthcare~"^(hospital|clinic|doctor)$"]${around};nwr[drinking_water=yes]${around};);out center meta ${RESOURCE_LIMIT};`
  let originalAt: string | undefined
  const requests: Promise<SafetyResource[]>[] = [resourceJson(OVERPASS_URL, signal, { method: 'POST', body: new URLSearchParams({ data: query }) }).then(value => { originalAt = validPastTimestamp(object(object(value).osm3s).timestamp_osm_base); return parseOverpass(value, location) })]
  if (OFFICIAL_RESOURCES_URL) {
    const url = new URL(OFFICIAL_RESOURCES_URL, typeof window === 'undefined' ? 'https://tapas.invalid' : window.location.origin)
    url.searchParams.set('lat', String(location.latitude)); url.searchParams.set('lon', String(location.longitude)); url.searchParams.set('radius_km', String(RESOURCE_RADIUS_KM))
    requests.push(resourceJson(url.href, signal).then(value => parseOfficialResources(value, location)))
  }
  const settled = await Promise.allSettled(requests)
  if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  const resources: SafetyResource[] = [], limitations: string[] = []
  let success = false
  for (const result of settled) {
    if (result.status === 'fulfilled') { resources.push(...result.value); success = true }
    else limitations.push(result.reason instanceof Error ? result.reason.message : 'A resource source is unavailable.')
  }
  if (!success) throw new Error(limitations.join(' '))
  if (resources.length >= RESOURCE_LIMIT) limitations.push('Results are limited; the nearest result is only the nearest among records returned.')
  if (!OFFICIAL_RESOURCES_URL) limitations.push('No official cooling, shelter or misting dataset is connected for this area.')
  return { status:'live', originalAt, resources: filterResources([...new Map(resources.map(resource => [resource.id, resource])).values()], 'all'), fetchedAt: new Date().toISOString(), source: 'OpenStreetMap via Overpass; authority sources where configured', limitations, unavailableCategories: (['cooling', 'shelter', 'misting'] as ResourceCategory[]).filter(category => !resources.some(resource => resource.category === category)) }
}

const RESOURCE_CACHE='tapas-real-poi-cache-v2'
export function recordedResources(location:SelectedLocation):ResourceResult|undefined{
 const match=poiSnapshot.recordings.filter(g=>distanceKm(location,g.location)<3).sort((a,b)=>distanceKm(location,a.location)-distanceKm(location,b.location))[0]
 if(!match)return undefined
 const resources=parseOverpass(match.data,location)
 return {status:'snapshot',originalAt:match.data.osm3s?.timestamp_osm_base??match.capturedAt,resources,fetchedAt:match.capturedAt,source:'OpenStreetMap via Overpass',note:'Recorded POI sample near '+match.location.name+'; original source dates preserved. Current operation unverified.',limitations:['Recorded coverage is partial; distances recalculated from your selected point.','No verified cooling-centre, shelter or misting dataset connected.'],unavailableCategories:['cooling','shelter','misting']}
}
function readResourceCache(location:SelectedLocation):ResourceResult|undefined{
 try{const rows=JSON.parse(localStorage.getItem(RESOURCE_CACHE)??'[]') as {key:string;result:ResourceResult}[];const saved=rows.find(r=>r.key===location.latitude.toFixed(5)+','+location.longitude.toFixed(5))?.result
 if(!saved||!Array.isArray(saved.resources)||!validPastTimestamp(saved.fetchedAt)||Date.now()-Date.parse(saved.fetchedAt)>86400000)return undefined
 const resources=saved.resources.filter(r=>typeof r.id==='string'&&typeof r.name==='string'&&validCoordinates(r.latitude,r.longitude)&&!!safeHttpUrl(r.sourceUrl)&&['medical','water','cooling','shelter','emergency','misting'].includes(r.category)&&distanceKm(location,r)<=RESOURCE_RADIUS_KM).map(r=>({...r,distanceKm:distanceKm(location,r),phone:phoneHref(r.phone)?r.phone:undefined}))
 return {...saved,resources,status:'cached',note:'Saved real resource listings; current availability unverified.'}
 }catch{return undefined}
}
export async function fetchResources(location:SelectedLocation,signal:AbortSignal):Promise<ResourceResult>{
 try{const result=await fetchResourcesLive(location,signal);try{const key=location.latitude.toFixed(5)+','+location.longitude.toFixed(5);const rows=JSON.parse(localStorage.getItem(RESOURCE_CACHE)??'[]');const next=JSON.stringify([...(Array.isArray(rows)?rows:[]).filter(r=>r.key!==key),{key,result}].slice(-12));if(next.length<1500000)localStorage.setItem(RESOURCE_CACHE,next)}catch{}return result}catch(error){if(signal.aborted)throw error;const saved=readResourceCache(location)??recordedResources(location);if(saved)return saved;throw error}
}
