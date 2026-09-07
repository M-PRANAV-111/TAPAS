import type { FacilityType, Language, RiskLevel, WbgtBand } from './types'

export const APP_NAME = 'TAPAS'
export const APP_LONG_NAME = 'Thermal Analytics & Public-health Advisory System'

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

export const LEGEND_NOTE = 'Colours show supplied risk categories. Grey means unavailable. Classification methodology must come from the source.'
export const TRANSLATION_DISCLAIMER = 'Source translation — verify before official use'
export const WBGT_BANDS: Record<WbgtBand, {label:string;color:string}> = {
  safe: {label:'Source: safe',color:'#1E8449'}, caution:{label:'Caution',color:'#F1C40F'},
  warning:{label:'Warning',color:'#E67E22'}, danger:{label:'Danger',color:'#C0392B'},
}
export const WBGT_BAND_ORDER: WbgtBand[] = ['safe','caution','warning','danger']

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
