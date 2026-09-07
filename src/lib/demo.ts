/**
 * Deterministic stand-in data.
 *
 * The dashboard is only ever a view over the TAPAS backend. When that backend
 * is unreachable (offline demo, judge laptop, backend still booting) the API
 * client falls back to this module so the UI still renders something coherent
 * instead of five empty panels. Every value here is illustrative — it is
 * replaced the moment `NEXT_PUBLIC_API_URL` answers.
 *
 * Values are derived from a hash of (ward_id, date) so the same day always
 * looks the same, and so different wards do not all share one colour.
 */

import {
  MORTALITY_CITATION,
  wbgtBand,
  wbgtRestPct,
} from './constants'
import type {
  Alert,
  AlertsResponse,
  Facility,
  FacilitiesResponse,
  ForecastHour,
  HindcastResponse,
  OccupationalHour,
  OccupationalResponse,
  RiskLevel,
  RiskMapResponse,
  RiskRankingResponse,
  WardForecast,
  WardRisk,
  WardRiskSeries,
} from './types'
import { forecastDates, hashString, hourLabel, parseIsoDate } from './utils'

export const DEMO_CITY = 'Hyderabad'

export const DEMO_WARDS: { ward_id: string; ward_name: string }[] = [
  { ward_id: 'HYD-001', ward_name: 'Secunderabad' },
  { ward_id: 'HYD-002', ward_name: 'Begumpet' },
  { ward_id: 'HYD-003', ward_name: 'Kukatpally' },
  { ward_id: 'HYD-004', ward_name: 'Mehdipatnam' },
  { ward_id: 'HYD-005', ward_name: 'Charminar' },
]

export function demoWardName(wardId: string): string {
  return DEMO_WARDS.find((w) => w.ward_id === wardId)?.ward_name ?? wardId
}

/** 0..1, stable for a given seed. */
function unit(seed: string): number {
  return (hashString(seed) % 1000) / 1000
}

/**
 * Dense urban cores hold night heat; the ward's own UTCI climatology already
 * encodes that, so the offset here stands in for the ward's built form.
 */
function wardHeatOffset(wardId: string): number {
  return (unit(`offset:${wardId}`) - 0.35) * 5
}

function baselineP97(wardId: string): number {
  return 40.5 + wardHeatOffset(wardId) * 0.4
}

function levelFromAnomaly(anomaly: number): RiskLevel {
  if (anomaly < -2) return 1
  if (anomaly < 0.5) return 2
  if (anomaly < 2.5) return 3
  if (anomaly < 4.5) return 4
  return 5
}

/**
 * Illustrative mortality scaling. The real numbers come from the backend's
 * exposure-response fit; this only has to be plausible and monotonic.
 */
function excessDeathsFor(level: RiskLevel, seed: string): {
  value: number
  low: number
  high: number
} {
  const jitter = unit(`deaths:${seed}`)
  const central = [0, 0.1, 0.8, 2.6, 6.2, 11.4][level] * (0.75 + jitter * 0.5)
  const spread = 0.35 + jitter * 0.15
  return {
    value: central,
    low: Math.max(0, central * (1 - spread)),
    high: central * (1 + spread),
  }
}

export function demoWardRisk(wardId: string, date: string): WardRisk {
  const seed = `${wardId}:${date}`
  const p97 = baselineP97(wardId)
  const dayIndex = parseIsoDate(date).getDay()
  // A synthetic heat episode that builds and then breaks, so the 5-day strip
  // is not flat.
  const wave = Math.sin((dayIndex / 7) * Math.PI * 2) * 2.2
  const anomaly = wave + (unit(seed) - 0.4) * 4 + wardHeatOffset(wardId) * 0.6
  const utciMax = p97 + anomaly
  const level = levelFromAnomaly(anomaly)
  const deaths = excessDeathsFor(level, seed)

  return {
    ward_id: wardId,
    ward_name: demoWardName(wardId),
    city: DEMO_CITY,
    date,
    risk_level: level,
    utci_max: Number(utciMax.toFixed(1)),
    utci_p97: Number(p97.toFixed(1)),
    utci_percentile: Math.min(99.9, 80 + anomaly * 4),
    heat_index_max: Number((utciMax + 5.5 + unit(`hi:${seed}`) * 2).toFixed(1)),
    hot_night: level >= 4 || unit(`night:${seed}`) > 0.72,
    consecutive_hot_days: level >= 3 ? 1 + (hashString(seed) % 4) : 0,
    excess_deaths: Number(deaths.value.toFixed(2)),
    excess_deaths_low: Number(deaths.low.toFixed(2)),
    excess_deaths_high: Number(deaths.high.toFixed(2)),
  }
}

export function demoRiskMap(date: string): RiskMapResponse {
  return {
    city: DEMO_CITY,
    date,
    generated_at: new Date().toISOString(),
    wards: DEMO_WARDS.map((w) => demoWardRisk(w.ward_id, date)),
  }
}

export function demoRanking(date: string, limit = 10): RiskRankingResponse {
  const wards = DEMO_WARDS.map((w) => demoWardRisk(w.ward_id, date))
    .sort(
      (a, b) =>
        b.risk_level - a.risk_level ||
        b.excess_deaths - a.excess_deaths ||
        b.utci_max - a.utci_max,
    )
    .slice(0, limit)
  return {
    city: DEMO_CITY,
    date,
    generated_at: new Date().toISOString(),
    wards,
  }
}

export function demoWardSeries(wardId: string, days = 5): WardRiskSeries {
  return {
    ward_id: wardId,
    ward_name: demoWardName(wardId),
    city: DEMO_CITY,
    generated_at: new Date().toISOString(),
    days: forecastDates(days).map((d) => demoWardRisk(wardId, d)),
  }
}

/** Diurnal UTCI curve: minimum around 05:00, peak around 15:00. */
function diurnal(hour: number, min: number, max: number): number {
  const amplitude = (max - min) / 2
  const mid = min + amplitude
  return mid + amplitude * Math.sin(((hour - 9) / 24) * Math.PI * 2)
}

export function demoForecast(wardId: string): WardForecast {
  const dates = forecastDates(2)
  const p97 = baselineP97(wardId)
  const hourly: ForecastHour[] = []

  dates.forEach((date, dayIdx) => {
    const day = demoWardRisk(wardId, date)
    const start = parseIsoDate(date)
    for (let h = 0; h < 24; h += 1) {
      const t = new Date(start)
      t.setHours(h, 0, 0, 0)
      const nightFloor = day.hot_night ? day.utci_max - 11 : day.utci_max - 15
      const utci = diurnal(h, nightFloor, day.utci_max)
      hourly.push({
        time: t.toISOString(),
        utci: Number(utci.toFixed(1)),
        baseline_p97: Number(diurnal(h, p97 - 13, p97).toFixed(1)),
        wbgt: Number((utci * 0.62 + 5 + dayIdx * 0.2).toFixed(1)),
        air_temp: Number((utci - 3.5).toFixed(1)),
        relative_humidity: Math.round(58 - diurnal(h, 0, 26)),
        heat_index: Number((utci + 5.5).toFixed(1)),
      })
    }
  })

  return {
    ward_id: wardId,
    ward_name: demoWardName(wardId),
    city: DEMO_CITY,
    generated_at: new Date().toISOString(),
    baseline_p97: Number(p97.toFixed(1)),
    hourly,
  }
}

function collapseWindows(
  hours: number[],
): { start: string; end: string }[] {
  if (hours.length === 0) return []
  const sorted = [...hours].sort((a, b) => a - b)
  const windows: { start: string; end: string }[] = []
  let runStart = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i]
    if (current !== prev + 1) {
      windows.push({ start: hourLabel(runStart), end: hourLabel(prev + 1) })
      runStart = current
    }
    prev = current
  }
  return windows
}

export function demoOccupational(
  wardId: string,
  date: string,
): OccupationalResponse {
  const day = demoWardRisk(wardId, date)
  const peak = day.utci_max * 0.62 + 5.5
  const trough = peak - 9.5

  const hourly: OccupationalHour[] = Array.from({ length: 24 }, (_, hour) => {
    const wbgt = Number(diurnal(hour, trough, peak).toFixed(1))
    const band = wbgtBand(wbgt)
    const rest = wbgtRestPct(band)
    return { hour, wbgt, band, work_pct: 100 - rest, rest_pct: rest }
  })

  const safeHours = hourly.filter((h) => h.band === 'safe').map((h) => h.hour)
  const avoidHours = hourly.filter((h) => h.band === 'danger').map((h) => h.hour)
  const warningHours = hourly
    .filter((h) => h.band === 'warning')
    .map((h) => h.hour)

  // The headline ratio describes the strictest band of the day over exactly
  // the hours that band covers — quoting 75% rest across merely-warning hours
  // would shut down work that the TLV allows.
  const strictest = avoidHours.length > 0 ? avoidHours : warningHours
  const strictestWindows = collapseWindows(strictest)
  const restPct = avoidHours.length > 0 ? 75 : 50

  return {
    ward_id: wardId,
    ward_name: demoWardName(wardId),
    date,
    hourly,
    safe_windows: collapseWindows(safeHours),
    avoid_windows: collapseWindows(avoidHours),
    work_rest:
      strictestWindows.length > 0
        ? {
            window: {
              start: strictestWindows[0].start,
              end: strictestWindows[strictestWindows.length - 1].end,
            },
            work_pct: 100 - restPct,
            rest_pct: restPct,
          }
        : null,
  }
}

const FACILITY_SEEDS: {
  suffix: string
  type: Facility['type']
  verifiedDaysAgo: number | null
}[] = [
  { suffix: 'Community Hall Cooling Centre', type: 'cooling_centre', verifiedDaysAgo: 2 },
  { suffix: 'Urban Primary Health Centre', type: 'phc', verifiedDaysAgo: 5 },
  { suffix: 'Area Hospital', type: 'hospital', verifiedDaysAgo: 14 },
  { suffix: 'Municipal School Shelter', type: 'shelter', verifiedDaysAgo: 41 },
  { suffix: 'Bus Stand Water Point', type: 'water_point', verifiedDaysAgo: null },
]

export function demoFacilities(wardId: string): FacilitiesResponse {
  const name = demoWardName(wardId)
  return {
    ward_id: wardId,
    facilities: FACILITY_SEEDS.map((seed, i) => {
      const verified =
        seed.verifiedDaysAgo === null
          ? null
          : new Date(Date.now() - seed.verifiedDaysAgo * 86_400_000)
              .toISOString()
              .slice(0, 10)
      return {
        id: `${wardId}-F${i + 1}`,
        name: `${name} ${seed.suffix}`,
        type: seed.type,
        distance_km: Number(
          (0.4 + unit(`dist:${wardId}:${i}`) * 2.6).toFixed(1),
        ),
        last_verified: verified,
        address: `${name}, ${DEMO_CITY}`,
        capacity: seed.type === 'cooling_centre' ? 120 + i * 40 : undefined,
      } satisfies Facility
    }),
  }
}

function advisoryEn(ward: string, level: RiskLevel): string {
  if (level >= 5) {
    return `Extreme heat expected in ${ward}. Stop all outdoor work between 11am and 5pm. All cooling centres are open and the emergency health protocol is active. Check on elderly residents and anyone living alone at least twice today. Take anyone with confusion, hot dry skin or fainting to the nearest hospital immediately.`
  }
  return `Very high heat risk in ${ward}. Avoid outdoor work between 12pm and 4pm. Designated cooling centres are open. Drink water every 20 minutes even if not thirsty, and use ORS if working outdoors. Outdoor workers, elderly residents and infants are most at risk.`
}

function advisoryHi(ward: string, level: RiskLevel): string {
  if (level >= 5) {
    return `${ward} में अत्यधिक गर्मी की चेतावनी। सुबह 11 बजे से शाम 5 बजे तक बाहर का सारा काम बंद रखें। सभी शीतलन केंद्र खुले हैं। बुजुर्गों और अकेले रहने वालों का दिन में दो बार हाल पूछें। चक्कर, बेहोशी या गर्म सूखी त्वचा दिखने पर तुरंत अस्पताल ले जाएं।`
  }
  return `${ward} में गर्मी का बहुत अधिक खतरा। दोपहर 12 से शाम 4 बजे तक बाहर काम करने से बचें। निर्धारित शीतलन केंद्र खुले हैं। प्यास न लगने पर भी हर 20 मिनट में पानी पिएं और बाहर काम करते समय ओआरएस लें।`
}

function advisoryTe(ward: string, level: RiskLevel): string {
  if (level >= 5) {
    return `${ward}లో తీవ్రమైన వేడి హెచ్చరిక. ఉదయం 11 నుండి సాయంత్రం 5 గంటల వరకు బయటి పనులు పూర్తిగా ఆపండి. అన్ని శీతలీకరణ కేంద్రాలు తెరిచి ఉన్నాయి. వృద్ధులను, ఒంటరిగా ఉండేవారిని రోజుకు రెండుసార్లు పరిశీలించండి. స్పృహ తప్పడం లేదా పొడి వేడి చర్మం కనిపిస్తే వెంటనే ఆసుపత్రికి తరలించండి.`
  }
  return `${ward}లో అధిక వేడి ప్రమాదం. మధ్యాహ్నం 12 నుండి సాయంత్రం 4 గంటల వరకు బయట పని చేయవద్దు. శీతలీకరణ కేంద్రాలు తెరిచి ఉన్నాయి. దాహం వేయకపోయినా ప్రతి 20 నిమిషాలకు నీరు తాగండి, బయట పని చేసేటప్పుడు ఓఆర్ఎస్ వాడండి.`
}

export function demoAlerts(minLevel = 4, limit = 50): AlertsResponse {
  const dates = forecastDates(3)
  const alerts: Alert[] = []

  dates.forEach((date) => {
    DEMO_WARDS.forEach((w) => {
      const risk = demoWardRisk(w.ward_id, date)
      if (risk.risk_level < minLevel) return
      const issued = new Date(parseIsoDate(date))
      issued.setHours(6, 30, 0, 0)
      alerts.push({
        id: `ALERT-${w.ward_id}-${date}`,
        ward_id: w.ward_id,
        ward_name: w.ward_name,
        city: DEMO_CITY,
        risk_level: risk.risk_level,
        date,
        issued_at: issued.toISOString(),
        expires_at: new Date(issued.getTime() + 36 * 3600_000).toISOString(),
        headline: `Level ${risk.risk_level} heat risk — ${w.ward_name}`,
        advisory_en: advisoryEn(w.ward_name, risk.risk_level),
        advisory_hi: advisoryHi(w.ward_name, risk.risk_level),
        advisory_te: advisoryTe(w.ward_name, risk.risk_level),
        ward_count: 1,
      })
    })
  })

  alerts.sort(
    (a, b) => b.risk_level - a.risk_level || a.date.localeCompare(b.date),
  )
  return { alerts: alerts.slice(0, limit) }
}

/** A CAP 1.2 message, the format state EOCs already ingest. */
export function demoCapXml(alertId: string): string {
  const alert =
    demoAlerts(1, 500).alerts.find((a) => a.id === alertId) ??
    demoAlerts(1, 1).alerts[0]

  if (!alert) return '<?xml version="1.0" encoding="UTF-8"?><alert/>'

  const severity = alert.risk_level >= 5 ? 'Extreme' : 'Severe'
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alert.id}</identifier>
  <sender>tapas@ghmc.gov.in</sender>
  <sent>${alert.issued_at}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>en-IN</language>
    <category>Health</category>
    <category>Met</category>
    <event>Heat Wave</event>
    <urgency>Expected</urgency>
    <severity>${severity}</severity>
    <certainty>Likely</certainty>
    <senderName>TAPAS — ${alert.city} Municipal Corporation</senderName>
    <headline>${alert.headline}</headline>
    <description>${alert.advisory_en}</description>
    <instruction>${alert.advisory_en}</instruction>
    <effective>${alert.issued_at}</effective>
    <expires>${alert.expires_at ?? alert.issued_at}</expires>
    <parameter>
      <valueName>risk_level</valueName>
      <value>${alert.risk_level}</value>
    </parameter>
    <area>
      <areaDesc>${alert.ward_name}, ${alert.city}</areaDesc>
      <geocode>
        <valueName>ward_id</valueName>
        <value>${alert.ward_id}</value>
      </geocode>
    </area>
  </info>
</alert>
`
}

/**
 * Hindcast rows shown on /about. These are placeholders describing well-known
 * Indian heat events; the real evaluation comes from GET /api/hindcast once the
 * backend is connected.
 */
export function demoHindcast(): HindcastResponse {
  return {
    events: [
      {
        date: '2015-05-24',
        city: 'Hyderabad',
        ward_name: 'Charminar',
        predicted_level: 5,
        observed_level: 5,
        observed_note: 'Telangana 2015 heatwave — large reported death toll',
        notes: 'Illustrative row. Replaced by GET /api/hindcast output.',
        hit: true,
      },
      {
        date: '2016-04-22',
        city: 'Hyderabad',
        ward_name: 'Mehdipatnam',
        predicted_level: 4,
        observed_level: 4,
        observed_note: 'Early-season heatwave, IMD red warning for Telangana',
        notes: 'Illustrative row. Replaced by GET /api/hindcast output.',
        hit: true,
      },
      {
        date: '2019-06-02',
        city: 'Hyderabad',
        ward_name: 'Kukatpally',
        predicted_level: 4,
        observed_level: 3,
        observed_note: 'Prolonged June heat, monsoon onset delayed',
        notes: 'Over-forecast by one level. Illustrative row.',
        hit: false,
      },
      {
        date: '2023-06-18',
        city: 'Hyderabad',
        ward_name: 'Secunderabad',
        predicted_level: 4,
        observed_level: 4,
        observed_note: 'Humid heat episode, high night-time minima',
        notes: 'Illustrative row. Replaced by GET /api/hindcast output.',
        hit: true,
      },
      {
        date: '2024-05-28',
        city: 'Hyderabad',
        ward_name: 'Begumpet',
        predicted_level: 5,
        observed_level: 5,
        observed_note: 'Record May maxima across north and central India',
        notes: 'Illustrative row. Replaced by GET /api/hindcast output.',
        hit: true,
      },
    ],
    summary: {
      events_evaluated: 5,
      method: `Placeholder validation set. Mortality model: ${MORTALITY_CITATION}`,
    },
  }
}
