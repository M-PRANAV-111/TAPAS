import type { FacilityType, Language, RiskLevel, WbgtBand } from './types'

export const APP_NAME = 'TAPAS'
export const APP_LONG_NAME = 'Thermal Analytics & Public-health Advisory System'
export const PILOT_CITY = 'Hyderabad'
export const PILOT_AUTHORITY = 'GHMC'

/** Hex values mirror the CSS custom properties in globals.css. */
export const RISK_COLORS: Record<RiskLevel, string> = {
  1: '#1E8449',
  2: '#F1C40F',
  3: '#E67E22',
  4: '#C0392B',
  5: '#641E16',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Very High',
  5: 'Extreme',
}

/**
 * Level 2 is amber; white text on amber fails contrast, so that badge alone
 * carries dark text.
 */
export const RISK_TEXT_COLORS: Record<RiskLevel, string> = {
  1: '#FFFFFF',
  2: '#1C2833',
  3: '#FFFFFF',
  4: '#FFFFFF',
  5: '#FFFFFF',
}

export const RISK_LEVELS: RiskLevel[] = [1, 2, 3, 4, 5]

export const LEGEND_NOTE =
  'Colour = UTCI percentile anomaly relative to the ward 1991–2020 baseline'

export const MORTALITY_CITATION =
  'Based on de Bont et al. (2024), Environ. Int. 184:108461'

export const MORTALITY_CITATION_LONG =
  'Based on de Bont et al. (2024) — 10 Indian cities, 3.6M deaths'

export const TRANSLATION_DISCLAIMER =
  'Machine translation — verify before official use'

export const WBGT_SOURCE_NOTE =
  'WBGT thresholds per ACGIH TLV and ISO 7243. Not a substitute for site-specific assessment.'

/** ACGIH TLV for moderate work. */
export const WBGT_TLV = 28

export const WBGT_BANDS: Record<
  WbgtBand,
  { label: string; color: string; min: number; max: number; note: string }
> = {
  safe: {
    label: 'Safe',
    color: '#1E8449',
    min: -Infinity,
    max: 25,
    note: 'WBGT below 25°C — continuous work',
  },
  caution: {
    label: 'Caution',
    color: '#F1C40F',
    min: 25,
    max: 28,
    note: '25–28°C — 25% rest each hour',
  },
  warning: {
    label: 'Warning',
    color: '#E67E22',
    min: 28,
    max: 32,
    note: '28–32°C — 50% rest each hour',
  },
  danger: {
    label: 'Danger',
    color: '#C0392B',
    min: 32,
    max: Infinity,
    note: '32°C and above — 75% rest each hour',
  },
}

export const WBGT_BAND_ORDER: WbgtBand[] = ['safe', 'caution', 'warning', 'danger']

export function wbgtBand(wbgt: number): WbgtBand {
  if (wbgt >= 32) return 'danger'
  if (wbgt >= 28) return 'warning'
  if (wbgt >= 25) return 'caution'
  return 'safe'
}

/** Rest share of each working hour implied by the band. */
export function wbgtRestPct(band: WbgtBand): number {
  switch (band) {
    case 'danger':
      return 75
    case 'warning':
      return 50
    case 'caution':
      return 25
    default:
      return 0
  }
}

/**
 * Heat Action Plan triggers. Each level lists the full set of actions for that
 * level, so the panel can render one flat list.
 */
const HAP_TRIGGERS: Record<RiskLevel, string[]> = {
  1: ['Routine monitoring — no ward-level action required'],
  2: [
    'Publish the daily forecast on the ward notice board',
    'Brief ASHA and ANM workers on early heat-illness signs',
  ],
  3: [
    'Open designated cooling centres from 11am to 5pm',
    'Refill drinking water points along main roads',
    'Advise rescheduling of outdoor work away from midday',
  ],
  4: [
    'Open all designated cooling centres',
    'Restrict outdoor construction work 12pm–4pm',
    'Pre-position ORS at 3 PHCs in ward',
    'Issue advisory in Telugu and Hindi',
  ],
  5: [
    'Open all designated cooling centres',
    'Restrict outdoor construction work 12pm–4pm',
    'Pre-position ORS at 3 PHCs in ward',
    'Issue advisory in Telugu and Hindi',
    'Activate emergency health protocol',
  ],
}

export function hapTriggers(level: RiskLevel): string[] {
  return HAP_TRIGGERS[level] ?? HAP_TRIGGERS[1]
}

export const FACILITY_LABELS: Record<FacilityType, string> = {
  cooling_centre: 'Cooling centre',
  hospital: 'Hospital',
  phc: 'Primary health centre',
  water_point: 'Water point',
  shelter: 'Night shelter',
}

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
]

/** Number of days in the forecast horizon, including today. */
export const FORECAST_DAYS = 5

/**
 * Freshness thresholds for facility verification, in days. Beyond STALE_DAYS a
 * record is not trustworthy enough to send a person to.
 */
export const FACILITY_FRESH_DAYS = 7
export const FACILITY_STALE_DAYS = 30

export const DATA_SOURCES: { name: string; provides: string; url: string }[] = [
  {
    name: 'IMD Numerical Weather Prediction',
    provides: 'Air temperature, humidity and wind forecast to +5 days',
    url: 'https://mausam.imd.gov.in/',
  },
  {
    name: 'ECMWF ERA5 / ERA5-HEAT',
    provides: 'UTCI reanalysis and the 1991–2020 ward climatology baseline',
    url: 'https://cds.climate.copernicus.eu/',
  },
  {
    name: 'NASA MODIS / Landsat 8-9',
    provides: 'Land surface temperature, urban heat island intensity',
    url: 'https://lpdaac.usgs.gov/',
  },
  {
    name: 'Census of India 2011',
    provides: 'Ward population, age structure, vulnerability weighting',
    url: 'https://censusindia.gov.in/',
  },
  {
    name: 'de Bont et al. (2024), Environ. Int. 184:108461',
    provides: 'Heat-mortality exposure-response for 10 Indian cities',
    url: 'https://doi.org/10.1016/j.envint.2024.108461',
  },
  {
    name: 'GHMC ward boundaries',
    provides: '197 ward polygons for the Hyderabad pilot',
    url: 'https://www.ghmc.gov.in/',
  },
  {
    name: 'OpenStreetMap',
    provides: 'Base map tiles, cooling centre and hospital locations',
    url: 'https://www.openstreetmap.org/copyright',
  },
]

export const TEAM_MEMBERS: { name: string; role: string }[] = [
  { name: 'Team member 1', role: 'Team lead / backend' },
  { name: 'Team member 2', role: 'Frontend and PWA' },
  { name: 'Team member 3', role: 'Climate data pipeline' },
  { name: 'Team member 4', role: 'Epidemiology and validation' },
  { name: 'Team member 5', role: 'GIS and ward boundaries' },
  { name: 'Team member 6', role: 'Field liaison, GHMC pilot' },
]
