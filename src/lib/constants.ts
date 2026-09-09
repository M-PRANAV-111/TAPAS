import type { FacilityType, Language, RiskLevel, WbgtBand } from './types'

export const APP_NAME = 'TAPAS'
export const APP_LONG_NAME = 'Thermal Analytics & Public-health Advisory System'

/** Hex values mirror the CSS custom properties in globals.css. */
export const RISK_COLORS: Record<RiskLevel, string> = {
  1: '#4A7C59',
  2: '#F6C453',
  3: '#EA762B',
  4: '#D3443F',
  5: '#741E29',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Very High',
  5: 'Extreme',
}

/**
 * Level 2 is amber; cream text on amber fails contrast, so that badge alone
 * carries near-black text.
 */
export const RISK_TEXT_COLORS: Record<RiskLevel, string> = {
  1: '#F4E4CC',
  2: '#17120E',
  3: '#F4E4CC',
  4: '#F4E4CC',
  5: '#F4E4CC',
}

export const RISK_LEVELS: RiskLevel[] = [1, 2, 3, 4, 5]

export const LEGEND_NOTE = 'Colours show supplied risk categories. Grey means unavailable. Classification methodology must come from the source.'
export const TRANSLATION_DISCLAIMER = 'Source translation — verify before official use'
export const WBGT_BANDS: Record<WbgtBand, {label:string;color:string}> = {
  safe: {label:'Source: safe',color:'#4A7C59'}, caution:{label:'Caution',color:'#F6C453'},
  warning:{label:'Warning',color:'#EA762B'}, danger:{label:'Danger',color:'#D3443F'},
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
