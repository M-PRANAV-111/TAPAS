/**
 * TAPAS API contract.
 *
 * Every field the UI depends on is declared here. Optional fields are the ones
 * the backend may legitimately omit; the UI degrades gracefully for those.
 */

export type RiskLevel = 1 | 2 | 3 | 4 | 5

/** Work/rest band derived from WBGT (ACGIH TLV / ISO 7243). */
export type WbgtBand = 'safe' | 'caution' | 'warning' | 'danger'

export type FacilityType =
  | 'cooling_centre'
  | 'hospital'
  | 'phc'
  | 'water_point'
  | 'shelter'

export type Language = 'en' | 'hi' | 'te'

/** One ward, one day. The unit of the whole product. */
export interface WardRisk {
  ward_id: string
  ward_name: string
  city: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  risk_level: RiskLevel
  /** Peak UTCI for the day, degrees C. */
  utci_max: number
  /** The ward 97th-percentile UTCI climatology for this calendar window. */
  utci_p97: number
  /** Percentile of utci_max against the 1991-2020 ward baseline. */
  utci_percentile?: number
  /** Peak NWS heat index, degrees C. */
  heat_index_max?: number
  /** Night-time minimum UTCI stayed above the ward hot-night threshold. */
  hot_night: boolean
  /** Run length of consecutive days at level >= 3 ending on this date. */
  consecutive_hot_days: number
  /** Central estimate of heat-attributable excess deaths for the ward-day. */
  excess_deaths: number
  /** Lower bound of the 90% interval. */
  excess_deaths_low: number
  /** Upper bound of the 90% interval. */
  excess_deaths_high: number
}

export interface RiskMapResponse {
  city: string
  date: string
  generated_at: string
  wards: WardRisk[]
}

export interface RiskRankingResponse {
  city: string
  date: string
  generated_at: string
  wards: WardRisk[]
}

/** 5-day outlook for a single ward. */
export interface WardRiskSeries {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string
  days: WardRisk[]
}

export interface ForecastHour {
  /** ISO 8601 timestamp with offset. */
  time: string
  utci: number
  /** Ward climatology (97th percentile) at this hour, degrees C. */
  baseline_p97: number
  wbgt?: number
  air_temp?: number
  relative_humidity?: number
  heat_index?: number
}

export interface WardForecast {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string
  /** Daily-scale baseline used for the headline comparison, degrees C. */
  baseline_p97: number
  /** 48 hourly steps. */
  hourly: ForecastHour[]
}

export interface OccupationalHour {
  /** 0-23, local time. */
  hour: number
  wbgt: number
  band: WbgtBand
  /** Recommended work share of each hour, 0-100. */
  work_pct: number
  rest_pct: number
}

export interface OccupationalWindow {
  start: string
  end: string
}

export interface OccupationalResponse {
  ward_id: string
  ward_name: string
  date: string
  hourly: OccupationalHour[]
  safe_windows: OccupationalWindow[]
  avoid_windows: OccupationalWindow[]
  work_rest: {
    window: OccupationalWindow
    work_pct: number
    rest_pct: number
  } | null
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  /** Straight-line distance from the ward centroid, km. */
  distance_km: number
  /** ISO date the record was last confirmed by a field officer. */
  last_verified: string | null
  address?: string
  capacity?: number
  phone?: string
}

export interface FacilitiesResponse {
  ward_id: string
  facilities: Facility[]
}

export interface Alert {
  id: string
  ward_id: string
  ward_name: string
  city: string
  risk_level: RiskLevel
  date: string
  issued_at: string
  expires_at?: string
  headline: string
  advisory_en: string
  advisory_hi: string
  advisory_te: string
  /** Number of wards covered by the parent alert group. */
  ward_count?: number
}

export interface AlertsResponse {
  alerts: Alert[]
}

export interface HindcastEvent {
  date: string
  city: string
  ward_id?: string
  ward_name?: string
  predicted_level: RiskLevel
  observed_level?: RiskLevel
  /** Reported excess mortality / press-reported deaths for the event. */
  observed_note: string
  notes?: string
  hit?: boolean
}

export interface HindcastResponse {
  events: HindcastEvent[]
  summary?: {
    events_evaluated: number
    hit_rate?: number
    false_alarm_rate?: number
    method?: string
  }
}

/** Ward polygons served statically from /public. */
export interface WardFeatureProperties {
  ward_id: string
  name: string
  city: string
  /** Injected client-side from the risk map response. */
  risk_level?: RiskLevel
  excess_deaths?: number
  utci_max?: number
}

export interface WardFeature {
  type: 'Feature'
  properties: WardFeatureProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface WardCollection {
  type: 'FeatureCollection'
  features: WardFeature[]
}
