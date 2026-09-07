/**
 * Typed TAPAS API client.
 *
 * Two things this layer is responsible for beyond calling fetch:
 *
 * 1. Normalising responses. The backend may return either a bare array or an
 *    envelope object; the UI should not have to care, and a missing optional
 *    field must never blank out a whole panel.
 * 2. Falling back to demo data when the backend is unreachable, so the
 *    dashboard is presentable without a running API. Every fallback flips
 *    `demoMode`, which the navbar surfaces — the UI never silently pretends
 *    demo numbers are live ones.
 */

import {
  demoAlerts,
  demoCapXml,
  demoFacilities,
  demoForecast,
  demoHindcast,
  demoOccupational,
  demoRanking,
  demoRiskMap,
  demoWardName,
  demoWardSeries,
} from './demo'
import { wbgtBand, wbgtRestPct } from './constants'
import type {
  Alert,
  AlertsResponse,
  Facility,
  FacilitiesResponse,
  ForecastHour,
  HindcastEvent,
  HindcastResponse,
  OccupationalHour,
  OccupationalResponse,
  OccupationalWindow,
  RiskMapResponse,
  RiskRankingResponse,
  WardForecast,
  WardRisk,
  WardRiskSeries,
} from './types'
import { clampRiskLevel, hourLabel, todayIso } from './utils'

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const DEMO_FALLBACK = process.env.NEXT_PUBLIC_DEMO_FALLBACK !== 'false'

const REQUEST_TIMEOUT_MS = 8000

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/* -------------------------------------------------------------------------- */
/* Demo-mode flag                                                             */
/* -------------------------------------------------------------------------- */

let demoMode = false
const demoListeners = new Set<() => void>()

export function isDemoMode(): boolean {
  return demoMode
}

export function subscribeDemoMode(listener: () => void): () => void {
  demoListeners.add(listener)
  return () => demoListeners.delete(listener)
}

function setDemoMode(next: boolean) {
  if (demoMode === next) return
  demoMode = next
  demoListeners.forEach((l) => l())
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                  */
/* -------------------------------------------------------------------------- */

async function request<T>(path: string, parseAs: 'json'): Promise<T>
async function request(path: string, parseAs: 'text'): Promise<string>
async function request<T>(
  path: string,
  parseAs: 'json' | 'text' = 'json',
): Promise<T | string> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: parseAs === 'json' ? { Accept: 'application/json' } : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new ApiError(`${res.status} ${res.statusText}`, res.status, url)
  }

  return parseAs === 'text' ? res.text() : ((await res.json()) as T)
}

/**
 * Run a request, and on any transport failure fall back to demo data (unless
 * the operator turned the fallback off, in which case the error propagates and
 * the panel shows a real error state).
 */
async function withFallback<T>(
  run: () => Promise<T>,
  fallback: () => T,
  label: string,
): Promise<T> {
  try {
    const value = await run()
    setDemoMode(false)
    return value
  } catch (error) {
    if (!DEMO_FALLBACK) throw error
    if (typeof console !== 'undefined') {
      console.warn(
        `[tapas] ${label} failed against ${BASE}; serving demo data.`,
        error,
      )
    }
    setDemoMode(true)
    return fallback()
  }
}

/* -------------------------------------------------------------------------- */
/* Normalisers                                                                */
/* -------------------------------------------------------------------------- */

type Json = Record<string, unknown>

function asRecord(value: unknown): Json {
  return value && typeof value === 'object' ? (value as Json) : {}
}

/** Accepts a bare array or an envelope keyed by any of `keys`. */
function unwrapList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload
  const record = asRecord(payload)
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function optionalNum(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

function normaliseWardRisk(raw: unknown, fallbackDate: string): WardRisk {
  const r = asRecord(raw)
  const wardId = str(r.ward_id ?? r.wardId ?? r.id, 'unknown')
  const utciMax = num(r.utci_max ?? r.utciMax ?? r.utci)
  const p97 = num(r.utci_p97 ?? r.baseline_p97 ?? r.utciP97, utciMax)
  const central = num(r.excess_deaths ?? r.excessDeaths ?? r.ed)
  const low = num(r.excess_deaths_low ?? r.ed_low ?? r.excessDeathsLow, central)
  const high = num(
    r.excess_deaths_high ?? r.ed_high ?? r.excessDeathsHigh,
    central,
  )

  return {
    ward_id: wardId,
    ward_name: str(r.ward_name ?? r.name ?? r.wardName, demoWardName(wardId)),
    city: str(r.city, 'Hyderabad'),
    date: str(r.date, fallbackDate),
    risk_level: clampRiskLevel(r.risk_level ?? r.riskLevel ?? r.level),
    utci_max: utciMax,
    utci_p97: p97,
    utci_percentile: optionalNum(r.utci_percentile ?? r.percentile),
    heat_index_max: optionalNum(r.heat_index_max ?? r.heat_index),
    hot_night: bool(r.hot_night ?? r.hotNight),
    consecutive_hot_days: num(
      r.consecutive_hot_days ?? r.consecutiveHotDays ?? r.run_length,
    ),
    excess_deaths: central,
    // Guard against an inverted or partial interval from the backend.
    excess_deaths_low: Math.min(low, central),
    excess_deaths_high: Math.max(high, central),
  }
}

function normaliseRiskMap(payload: unknown, date: string): RiskMapResponse {
  const record = asRecord(payload)
  return {
    city: str(record.city, 'Hyderabad'),
    date: str(record.date, date),
    generated_at: str(record.generated_at, new Date().toISOString()),
    wards: unwrapList(payload, ['wards', 'items', 'results', 'data']).map((w) =>
      normaliseWardRisk(w, date),
    ),
  }
}

function normaliseForecast(payload: unknown, wardId: string): WardForecast {
  const record = asRecord(payload)
  const hourlyRaw = unwrapList(record.hourly ?? payload, [
    'hourly',
    'hours',
    'items',
    'data',
  ])
  const baseline = num(record.baseline_p97 ?? record.utci_p97, 0)

  const hourly: ForecastHour[] = hourlyRaw.map((raw) => {
    const h = asRecord(raw)
    return {
      time: str(h.time ?? h.timestamp ?? h.datetime),
      utci: num(h.utci ?? h.value),
      baseline_p97: num(h.baseline_p97 ?? h.baseline ?? h.p97, baseline),
      wbgt: optionalNum(h.wbgt),
      air_temp: optionalNum(h.air_temp ?? h.temp_c ?? h.temperature),
      relative_humidity: optionalNum(h.relative_humidity ?? h.rh),
      heat_index: optionalNum(h.heat_index),
    }
  })

  return {
    ward_id: str(record.ward_id, wardId),
    ward_name: str(record.ward_name ?? record.name, demoWardName(wardId)),
    city: str(record.city, 'Hyderabad'),
    generated_at: str(record.generated_at, new Date().toISOString()),
    baseline_p97: baseline || (hourly[0]?.baseline_p97 ?? 0),
    hourly,
  }
}

function normaliseWardSeries(payload: unknown, wardId: string): WardRiskSeries {
  const record = asRecord(payload)
  const days = unwrapList(record.days ?? payload, [
    'days',
    'items',
    'results',
    'data',
  ]).map((d) => normaliseWardRisk(d, todayIso()))

  return {
    ward_id: str(record.ward_id, wardId),
    ward_name: str(
      record.ward_name ?? record.name,
      days[0]?.ward_name ?? demoWardName(wardId),
    ),
    city: str(record.city, days[0]?.city ?? 'Hyderabad'),
    generated_at: str(record.generated_at, new Date().toISOString()),
    days,
  }
}

function normaliseWindows(raw: unknown): OccupationalWindow[] {
  return unwrapList(raw, ['windows', 'items']).map((w) => {
    if (typeof w === 'string') {
      const [start, end] = w.split(/[–-]/).map((s) => s.trim())
      return { start: start ?? '', end: end ?? '' }
    }
    const rec = asRecord(w)
    return { start: str(rec.start ?? rec.from), end: str(rec.end ?? rec.to) }
  })
}

function normaliseOccupational(
  payload: unknown,
  wardId: string,
  date: string,
): OccupationalResponse {
  const record = asRecord(payload)
  const hourly: OccupationalHour[] = unwrapList(record.hourly ?? payload, [
    'hourly',
    'hours',
    'items',
    'data',
  ]).map((raw, index) => {
    const h = asRecord(raw)
    const wbgt = num(h.wbgt ?? h.value)
    const band = (h.band as OccupationalHour['band']) ?? wbgtBand(wbgt)
    const rest = optionalNum(h.rest_pct) ?? wbgtRestPct(band)
    return {
      hour: optionalNum(h.hour) ?? index,
      wbgt,
      band,
      work_pct: optionalNum(h.work_pct) ?? 100 - rest,
      rest_pct: rest,
    }
  })

  const workRestRaw = asRecord(record.work_rest)
  const windowRaw = asRecord(workRestRaw.window)

  return {
    ward_id: str(record.ward_id, wardId),
    ward_name: str(record.ward_name ?? record.name, demoWardName(wardId)),
    date: str(record.date, date),
    hourly,
    safe_windows: normaliseWindows(record.safe_windows),
    avoid_windows: normaliseWindows(record.avoid_windows),
    work_rest:
      Object.keys(workRestRaw).length > 0
        ? {
            window: {
              start: str(windowRaw.start, hourLabel(10)),
              end: str(windowRaw.end, hourLabel(18)),
            },
            work_pct: num(workRestRaw.work_pct, 25),
            rest_pct: num(workRestRaw.rest_pct, 75),
          }
        : null,
  }
}

function normaliseFacilities(
  payload: unknown,
  wardId: string,
): FacilitiesResponse {
  const facilities: Facility[] = unwrapList(payload, [
    'facilities',
    'items',
    'results',
    'data',
  ]).map((raw, i) => {
    const f = asRecord(raw)
    const lastVerified = f.last_verified ?? f.lastVerified ?? f.verified_at
    return {
      id: str(f.id ?? f.facility_id, `${wardId}-F${i + 1}`),
      name: str(f.name, 'Unnamed facility'),
      type: (str(f.type ?? f.category, 'cooling_centre') as Facility['type']),
      distance_km: num(f.distance_km ?? f.distance),
      last_verified: typeof lastVerified === 'string' ? lastVerified : null,
      address: typeof f.address === 'string' ? f.address : undefined,
      capacity: optionalNum(f.capacity),
      phone: typeof f.phone === 'string' ? f.phone : undefined,
    }
  })

  return { ward_id: wardId, facilities }
}

function normaliseAlerts(payload: unknown): AlertsResponse {
  const alerts: Alert[] = unwrapList(payload, [
    'alerts',
    'items',
    'results',
    'data',
  ]).map((raw, i) => {
    const a = asRecord(raw)
    const wardId = str(a.ward_id ?? a.wardId, 'unknown')
    const wardName = str(a.ward_name ?? a.name, demoWardName(wardId))
    const level = clampRiskLevel(a.risk_level ?? a.level)
    return {
      id: str(a.id ?? a.alert_id ?? a.identifier, `alert-${i}`),
      ward_id: wardId,
      ward_name: wardName,
      city: str(a.city, 'Hyderabad'),
      risk_level: level,
      date: str(a.date, todayIso()),
      issued_at: str(a.issued_at ?? a.sent, new Date().toISOString()),
      expires_at: typeof a.expires_at === 'string' ? a.expires_at : undefined,
      headline: str(a.headline, `Level ${level} heat risk — ${wardName}`),
      advisory_en: str(a.advisory_en ?? a.description ?? a.advisory),
      advisory_hi: str(a.advisory_hi),
      advisory_te: str(a.advisory_te),
      ward_count: optionalNum(a.ward_count),
    }
  })

  return { alerts }
}

function normaliseHindcast(payload: unknown): HindcastResponse {
  const events: HindcastEvent[] = unwrapList(payload, [
    'events',
    'items',
    'results',
    'rows',
    'data',
  ]).map((raw) => {
    const e = asRecord(raw)
    return {
      date: str(e.date),
      city: str(e.city, 'Hyderabad'),
      ward_id: typeof e.ward_id === 'string' ? e.ward_id : undefined,
      ward_name: typeof e.ward_name === 'string' ? e.ward_name : undefined,
      predicted_level: clampRiskLevel(e.predicted_level ?? e.predicted),
      observed_level:
        e.observed_level === undefined || e.observed_level === null
          ? undefined
          : clampRiskLevel(e.observed_level),
      observed_note: str(e.observed_note ?? e.observed ?? e.outcome),
      notes: typeof e.notes === 'string' ? e.notes : undefined,
      hit: e.hit === undefined ? undefined : bool(e.hit),
    }
  })

  const summaryRaw = asRecord(asRecord(payload).summary)
  return {
    events,
    summary:
      Object.keys(summaryRaw).length > 0
        ? {
            events_evaluated: num(summaryRaw.events_evaluated, events.length),
            hit_rate: optionalNum(summaryRaw.hit_rate),
            false_alarm_rate: optionalNum(summaryRaw.false_alarm_rate),
            method:
              typeof summaryRaw.method === 'string'
                ? summaryRaw.method
                : undefined,
          }
        : undefined,
  }
}

/* -------------------------------------------------------------------------- */
/* Public client                                                              */
/* -------------------------------------------------------------------------- */

export const api = {
  riskMap: (date: string): Promise<RiskMapResponse> =>
    withFallback(
      async () =>
        normaliseRiskMap(
          await request<unknown>(`/api/risk/map?date=${date}`, 'json'),
          date,
        ),
      () => demoRiskMap(date),
      `GET /api/risk/map?date=${date}`,
    ),

  ranking: (date: string, limit = 10): Promise<RiskRankingResponse> =>
    withFallback(
      async () =>
        normaliseRiskMap(
          await request<unknown>(
            `/api/risk/ranking?date=${date}&limit=${limit}`,
            'json',
          ),
          date,
        ),
      () => demoRanking(date, limit),
      `GET /api/risk/ranking?date=${date}`,
    ),

  wardForecast: (wardId: string): Promise<WardForecast> =>
    withFallback(
      async () =>
        normaliseForecast(
          await request<unknown>(`/api/forecast/${wardId}`, 'json'),
          wardId,
        ),
      () => demoForecast(wardId),
      `GET /api/forecast/${wardId}`,
    ),

  wardRisk: (wardId: string, days = 5): Promise<WardRiskSeries> =>
    withFallback(
      async () =>
        normaliseWardSeries(
          await request<unknown>(`/api/risk/${wardId}?days=${days}`, 'json'),
          wardId,
        ),
      () => demoWardSeries(wardId, days),
      `GET /api/risk/${wardId}`,
    ),

  occupational: (wardId: string, date: string): Promise<OccupationalResponse> =>
    withFallback(
      async () =>
        normaliseOccupational(
          await request<unknown>(
            `/api/occupational/${wardId}?date=${date}`,
            'json',
          ),
          wardId,
          date,
        ),
      () => demoOccupational(wardId, date),
      `GET /api/occupational/${wardId}`,
    ),

  facilities: (wardId: string): Promise<FacilitiesResponse> =>
    withFallback(
      async () =>
        normaliseFacilities(
          await request<unknown>(`/api/facilities/${wardId}`, 'json'),
          wardId,
        ),
      () => demoFacilities(wardId),
      `GET /api/facilities/${wardId}`,
    ),

  alerts: (level = 4, limit = 50): Promise<AlertsResponse> =>
    withFallback(
      async () =>
        normaliseAlerts(
          await request<unknown>(
            `/api/alerts?level=${level}&limit=${limit}`,
            'json',
          ),
        ),
      () => demoAlerts(level, limit),
      `GET /api/alerts?level=${level}`,
    ),

  capXml: (alertId: string): Promise<string> =>
    withFallback(
      () => request(`/api/alerts/${alertId}/cap`, 'text'),
      () => demoCapXml(alertId),
      `GET /api/alerts/${alertId}/cap`,
    ),

  hindcast: (): Promise<HindcastResponse> =>
    withFallback(
      async () =>
        normaliseHindcast(await request<unknown>('/api/hindcast', 'json')),
      () => demoHindcast(),
      'GET /api/hindcast',
    ),
}

export type Api = typeof api
