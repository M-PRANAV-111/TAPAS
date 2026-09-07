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

/** Origin metadata belongs to each result, never to a global live/demo flag. */
export interface DataProvenance {
  status?: 'live' | 'cached' | 'snapshot'
  originalAt?: string | null
  note?: string
  latitude?: number
  longitude?: number
  source: string | null
  issuedAt: string | null
  fetchedAt: string
  geographicId: string
  fromCache: boolean
  validUntil: string | null
}

/** One ward, one day. The unit of the whole product. */
export interface WardRisk {
  ward_id: string
  ward_name: string
  city: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  risk_level: RiskLevel | null
  /** Peak UTCI for the day, degrees C. */
  utci_max: number | null
  /** The ward 97th-percentile UTCI climatology for this calendar window. */
  utci_p97: number | null
  /** Percentile of utci_max against the 1991-2020 ward baseline. */
  utci_percentile?: number | null
  /** Peak NWS heat index, degrees C. */
  heat_index_max?: number | null
  /** Night-time minimum UTCI stayed above the ward hot-night threshold. */
  hot_night: boolean | null
  /** Run length of consecutive days at level >= 3 ending on this date. */
  consecutive_hot_days: number | null
  /** Central estimate of heat-attributable excess deaths for the ward-day. */
  excess_deaths: number | null
  /** Lower bound of the supplied uncertainty interval. */
  excess_deaths_low: number | null
  /** Upper bound of the supplied uncertainty interval. */
  excess_deaths_high: number | null
  confidence_level?: number | null
  interval_type?: string | null
  model_source?: string | null
  provenance?: DataProvenance
}

export interface RiskMapResponse {
  city: string
  date: string
  generated_at: string | null
  wards: WardRisk[]
  summary?: WardRisk | null
  coverage?: 'available' | 'none'
  methodology?: string | null
  run_id?: string | null
  provenance?: DataProvenance
}

export interface RiskRankingResponse {
  city: string
  date: string
  generated_at: string | null
  wards: WardRisk[]
  provenance?: DataProvenance
}

/** 5-day outlook for a single ward. */
export interface WardRiskSeries {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string | null
  days: WardRisk[]
  provenance?: DataProvenance
}

export interface ForecastHour {
  /** ISO 8601 timestamp with offset. */
  time: string
  utci: number | null
  /** Ward climatology (97th percentile) at this hour, degrees C. */
  baseline_p97: number | null
  wbgt?: number | null
  air_temp?: number | null
  relative_humidity?: number | null
  heat_index?: number | null
}

export interface WardForecast {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string | null
  /** Daily-scale baseline used for the headline comparison, degrees C. */
  baseline_p97: number | null
  /** 48 hourly steps. */
  hourly: ForecastHour[]
  provenance?: DataProvenance
}

export interface OccupationalHour {
  /** 0-23, local time. */
  hour: number
  wbgt: number | null
  band: WbgtBand | null
  /** Recommended work share of each hour, 0-100. */
  work_pct: number | null
  rest_pct: number | null
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
  safe_windows: OccupationalWindow[] | null
  avoid_windows: OccupationalWindow[] | null
  work_rest: {
    window: OccupationalWindow
    work_pct: number
    rest_pct: number
  } | null
  provenance?: DataProvenance
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  /** Straight-line distance from the ward centroid, km. */
  distance_km: number | null
  /** ISO date the record was last confirmed by a field officer. */
  last_verified: string | null
  address?: string
  capacity?: number
  phone?: string
  latitude?: number
  longitude?: number
}

export interface FacilitiesResponse {
  ward_id: string
  facilities: Facility[]
  provenance?: DataProvenance
}

export interface Alert {
  id: string
  ward_id: string
  ward_name: string
  city: string
  risk_level: RiskLevel | null
  date: string
  issued_at: string | null
  expires_at?: string | null
  headline: string
  advisory_en: string
  advisory_hi: string
  advisory_te: string
  /** Number of wards covered by the parent alert group. */
  ward_count?: number
  provenance?: DataProvenance
}

export interface AlertsResponse {
  alerts: Alert[]
  provenance?: DataProvenance
}

export interface HindcastEvent {
  date: string
  city: string
  ward_id?: string
  ward_name?: string
  predicted_level: RiskLevel | null
  observed_level?: RiskLevel | null
  /** Reported excess mortality / press-reported deaths for the event. */
  observed_note: string
  notes?: string
  hit?: boolean
}

export interface HindcastResponse {
  events: HindcastEvent[]
  provenance?: DataProvenance
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
  risk_level?: RiskLevel | null
  excess_deaths?: number | null
  utci_max?: number | null
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
  geographic_id?: string
  version?: string
  source?: string
  provenance?: DataProvenance
}
