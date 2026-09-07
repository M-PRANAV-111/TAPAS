'use client'

import { ArrowRight, ExternalLink } from 'lucide-react'

import { RiskBadge } from '@/components/risk/RiskBadge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHindcast } from '@/hooks/useAlerts'
import {
  APP_LONG_NAME,
  APP_NAME,
  DATA_SOURCES,
  MORTALITY_CITATION,
  PILOT_AUTHORITY,
  PILOT_CITY,
  RISK_LEVELS,
  TEAM_MEMBERS,
} from '@/lib/constants'
import { shortDate } from '@/lib/utils'

const PIPELINE = [
  {
    step: 'IMD forecast',
    detail: 'Temperature, humidity, wind and radiation to +5 days',
  },
  {
    step: 'UTCI',
    detail: 'Combined into one felt-temperature index per ward-hour',
  },
  {
    step: 'Ward baseline',
    detail: 'Compared against that ward 1991–2020 climatology',
  },
  {
    step: 'Risk level 1–5',
    detail: 'Percentile anomaly, hot nights and run length',
  },
  {
    step: 'Excess deaths',
    detail: 'Exposure-response applied to ward population',
  },
]

const LEVEL_RULES: Record<number, string> = {
  1: 'At or below the ward seasonal norm',
  2: 'Warm, near the 90th percentile',
  3: 'At or above the 95th percentile',
  4: 'At or above the 97th percentile, or a hot night follows a hot day',
  5: 'Far above the 97th percentile, or three or more consecutive level-4 days',
}

export default function AboutPage() {
  const { data, isPending, isError } = useHindcast()

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-3 py-6 sm:px-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          About {APP_NAME}
        </h1>
        <p className="mt-0.5 text-sm tapas-subtext">{APP_LONG_NAME}</p>
      </header>

      <section aria-labelledby="what">
        <h2 id="what" className="mb-2 text-base font-semibold">
          What is {APP_NAME}?
        </h2>
        <p className="text-sm leading-relaxed">
          {APP_NAME} is a ward-level heat early-warning system for Indian
          municipal authorities. It turns a city-wide weather forecast into a
          five-day risk level, an expected excess-mortality range, and a
          specific list of actions for each ward, because a heatwave is not felt
          equally across a city. The {PILOT_CITY} pilot covers all{' '}
          {PILOT_AUTHORITY} wards and is designed to plug into an existing Heat
          Action Plan rather than replace it.
        </p>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-2 text-base font-semibold">
          How is risk calculated?
        </h2>
        <p className="text-sm leading-relaxed">
          The forecast is converted into the Universal Thermal Climate Index —
          one number combining heat, humidity, wind and radiation — for every
          ward and hour. That value is then compared with the same ward&apos;s own
          1991–2020 baseline, so a ward is judged against what is normal{' '}
          <em>there</em>, not against a national threshold. How far above its own
          97th percentile a ward sits, whether the night stays hot, and how many
          days the run has lasted together give the level 1–5. The level and the
          ward&apos;s population feed a published heat-mortality
          exposure-response curve to produce the expected excess deaths and its
          uncertainty range.
        </p>

        <ol
          className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Risk calculation pipeline"
        >
          {PIPELINE.map((node, index) => (
            <li
              key={node.step}
              className="rounded-md border border-border bg-white p-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] tapas-subtext">
                  {index + 1}
                </span>
                {node.step}
                {index < PIPELINE.length - 1 ? (
                  <ArrowRight
                    className="ml-auto h-3 w-3 shrink-0 tapas-subtext"
                    aria-hidden="true"
                  />
                ) : null}
              </p>
              <p className="mt-1 text-[11px] leading-snug tapas-subtext">
                {node.detail}
              </p>
            </li>
          ))}
        </ol>

        <ul className="mt-3 space-y-1.5">
          {RISK_LEVELS.map((level) => (
            <li key={level} className="flex flex-wrap items-center gap-2">
              <RiskBadge level={level} size="sm" />
              <span className="text-xs tapas-subtext">{LEVEL_RULES[level]}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs italic tapas-subtext">
          {MORTALITY_CITATION}. Mortality figures are model estimates with a 90%
          interval, never observed counts.
        </p>
      </section>

      <section aria-labelledby="sources">
        <h2 id="sources" className="mb-2 text-base font-semibold">
          Data sources
        </h2>
        <div className="rounded-lg border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Provides</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DATA_SOURCES.map((source) => (
                <TableRow key={source.name}>
                  <TableCell className="text-xs font-medium">
                    {source.name}
                  </TableCell>
                  <TableCell className="text-xs tapas-subtext">
                    {source.provides}
                  </TableCell>
                  <TableCell>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="team">
        <h2 id="team" className="mb-2 text-base font-semibold">
          Team
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TEAM_MEMBERS.map((member) => (
            <li
              key={member.role}
              className="rounded-md border border-border bg-white p-2.5"
            >
              <p className="text-sm font-medium">{member.name}</p>
              <p className="text-xs tapas-subtext">{member.role}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs tapas-subtext">
          Smart India Hackathon 2026 · problem statement SIH26083.
        </p>
      </section>

      <section aria-labelledby="validation">
        <h2 id="validation" className="mb-2 text-base font-semibold">
          Validation
        </h2>
        <p className="mb-2 text-sm leading-relaxed">
          The model is run backwards over past heat events and its level is
          compared with what was recorded at the time. A system like this earns
          trust by being checked against events it did not see during
          development.
        </p>

        {isPending ? (
          <p className="text-sm tapas-subtext">Loading hindcast results…</p>
        ) : null}

        {isError ? (
          <p className="text-sm text-[var(--risk-4)]">
            Hindcast results unavailable from the API.
          </p>
        ) : null}

        {data ? (
          <div
            className="rounded-lg border border-border bg-white"
            data-testid="hindcast-table"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Observed / notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((event) => (
                  <TableRow key={`${event.date}-${event.ward_name ?? event.city}`}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {shortDate(event.date)}{' '}
                      <span className="tapas-subtext">
                        {event.date.slice(0, 4)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {event.ward_name ?? event.city}
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={event.predicted_level} size="sm" compact />
                    </TableCell>
                    <TableCell className="text-xs tapas-subtext">
                      {event.observed_note}
                      {event.notes ? (
                        <span className="mt-0.5 block italic">{event.notes}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                {data.summary?.method ??
                  'Hindcast evaluation served by GET /api/hindcast.'}
              </TableCaption>
            </Table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
