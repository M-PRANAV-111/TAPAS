import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CloudSun,
  LifeBuoy,
  Map,
  MessageSquareWarning,
  ShieldAlert,
  Thermometer,
  Users,
} from 'lucide-react'

const HOW_IT_WORKS = [
  { icon: CloudSun, label: 'Weather' },
  { icon: Thermometer, label: 'Thermal Stress' },
  { icon: ShieldAlert, label: 'Risk' },
  { icon: Users, label: 'Vulnerability' },
  { icon: LifeBuoy, label: 'Resources' },
  { icon: ArrowRight, label: 'Action' },
] as const

const CAPABILITIES = [
  { icon: Map, label: 'Pan-India heat monitoring' },
  { icon: Thermometer, label: 'Human thermal stress (UTCI)' },
  { icon: CalendarClock, label: '3–5 day early warning' },
  { icon: MessageSquareWarning, label: 'Citizen advisories' },
  { icon: LifeBuoy, label: 'Nearby safety resources' },
  { icon: BarChart3, label: 'Administrative decision support' },
] as const

export function LandingSections() {
  return (
    <div className="bg-[var(--bg)]">
      <section aria-labelledby="how-it-works-heading" className="mx-auto max-w-5xl px-3 py-12 sm:px-4">
        <h2 id="how-it-works-heading" className="text-center text-base font-semibold">
          How TAPAS Works
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-4 overflow-x-auto">
          {HOW_IT_WORKS.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium tapas-subtext">{label}</span>
              </div>
              {i < HOW_IT_WORKS.length - 1 ? (
                <ArrowRight className="h-4 w-4 shrink-0 tapas-subtext" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="mx-auto max-w-5xl px-3 py-12 sm:px-4">
        <h2 id="capabilities-heading" className="text-center text-base font-semibold">
          Core capabilities
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Data transparency" className="border-y border-border bg-secondary/60">
        <p className="mx-auto max-w-3xl px-3 py-6 text-center text-sm tapas-subtext sm:px-4">
          Powered by Open-Meteo (ECMWF), OpenStreetMap, and published Indian heat-mortality research. Live ·
          Cached · Snapshot data is always labelled.
        </p>
      </section>

      <footer className="mx-auto max-w-5xl px-3 py-6 text-xs tapas-subtext sm:px-4">
        Smart India Hackathon 2026 prototype (SIH26083). Map data:{' '}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors, ODbL
        </a>
        .
      </footer>
    </div>
  )
}
