'use client'

import { useMemo, useState } from 'react'
import { Moon, X, Zap } from 'lucide-react'

import { DeathsDisplay } from '@/components/risk/DeathsDisplay'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { FacilitiesTab } from '@/components/ward/FacilitiesTab'
import { RiskStrip } from '@/components/ward/RiskStrip'
import { UtciChart } from '@/components/ward/UtciChart'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAlerts } from '@/hooks/useAlerts'
import { useWard } from '@/hooks/useWard'
import {
  LANGUAGES,
  TRANSLATION_DISCLAIMER,
  hapTriggers,
} from '@/lib/constants'
import type { Language, WardRisk } from '@/lib/types'
import { cn, formatTemp, parseIsoDate } from '@/lib/utils'

export interface WardPanelProps {
  wardId: string
  wardName?: string
  selectedDate: string
  onDaySelect: (date: string) => void
  onClose: () => void
  className?: string
}

export function WardPanel({
  wardId,
  wardName,
  selectedDate,
  onDaySelect,
  onClose,
  className,
}: WardPanelProps) {
  const { forecast, risk, facilities } = useWard(wardId)
  const { data: alertData } = useAlerts(1, 200)
  const [language, setLanguage] = useState<Language>('en')

  const days = risk.data?.days ?? []
  const today: WardRisk | undefined =
    days.find((d) => d.date === selectedDate) ?? days[0]

  const displayName = risk.data?.ward_name ?? wardName ?? wardId

  const alert = useMemo(
    () =>
      alertData?.alerts.find(
        (a) => a.ward_id === wardId && a.date === selectedDate,
      ) ?? alertData?.alerts.find((a) => a.ward_id === wardId),
    [alertData, wardId, selectedDate],
  )

  return (
    <aside
      data-testid="ward-panel"
      aria-label={`Ward detail: ${displayName}`}
      className={cn('flex h-full flex-col bg-white', className)}
    >
      <header className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{displayName}</h2>
          <div className="mt-1.5">
            {today ? (
              <RiskBadge level={today.risk_level} size="md" />
            ) : (
              <span className="text-xs tapas-subtext">
                {risk.isPending ? 'Loading ward…' : 'No forecast for this ward'}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close ward panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <section aria-label="Five day outlook">
          <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
            5-day outlook
          </h3>
          <RiskStrip
            className="mt-2"
            days={days}
            selectedDate={selectedDate}
            onDaySelect={onDaySelect}
          />
        </section>

        <Separator className="my-3" />

        <Tabs defaultValue="forecast">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="forecast">
              Forecast
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="advisory">
              Advisory
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="facilities">
              Facilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <section aria-label="UTCI forecast">
              <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
                48-hour UTCI vs ward baseline
              </h3>
              {forecast.isPending ? (
                <p className="mt-2 text-xs tapas-subtext">Loading forecast…</p>
              ) : (
                <UtciChart
                  className="mt-1"
                  hourly={forecast.data?.hourly ?? []}
                  baselineP97={forecast.data?.baseline_p97}
                />
              )}
              {today ? <PlainLanguage day={today} /> : null}
            </section>

            {today ? <KeyNumbers day={today} /> : null}

            {today ? (
              <section aria-label="Expected excess deaths">
                <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
                  Expected excess deaths
                </h3>
                <DeathsDisplay
                  className="mt-1.5"
                  value={today.excess_deaths}
                  low={today.excess_deaths_low}
                  high={today.excess_deaths_high}
                  level={today.risk_level}
                  when={today.date === selectedDate ? 'today' : 'that day'}
                />
              </section>
            ) : null}

            {today ? <HapTriggers level={today.risk_level} /> : null}
          </TabsContent>

          <TabsContent value="advisory" className="space-y-2">
            <div className="flex gap-1" role="group" aria-label="Advisory language">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  aria-pressed={language === lang.code}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    language === lang.code
                      ? 'border-foreground/40 bg-secondary font-medium'
                      : 'border-border hover:bg-secondary/60',
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <AdvisoryText
              language={language}
              text={
                language === 'en'
                  ? alert?.advisory_en
                  : language === 'hi'
                    ? alert?.advisory_hi
                    : alert?.advisory_te
              }
            />
          </TabsContent>

          <TabsContent value="facilities">
            <FacilitiesTab
              facilities={facilities.data?.facilities ?? []}
              isLoading={facilities.isPending}
              isError={facilities.isError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}

/**
 * A UTCI number on its own is meaningless to a ward officer. This sentence is
 * the translation layer between the model and the decision.
 */
function PlainLanguage({ day }: { day: WardRisk }) {
  const delta = day.utci_max - day.utci_p97
  const month = parseIsoDate(day.date).toLocaleDateString('en-IN', {
    month: 'long',
  })

  return (
    <p className="mt-2 rounded-md bg-secondary/70 p-2 text-xs leading-relaxed">
      Peak UTCI <strong>{formatTemp(day.utci_max)}</strong> is{' '}
      <strong>
        {Math.abs(delta).toFixed(1)}°C {delta >= 0 ? 'above' : 'below'}
      </strong>{' '}
      the 97th percentile for this ward in {month} (
      {formatTemp(day.utci_p97)}).
    </p>
  )
}

function KeyNumbers({ day }: { day: WardRisk }) {
  const items: { label: string; value: string; tone?: string }[] = [
    { label: 'Peak UTCI today', value: formatTemp(day.utci_max) },
    { label: 'Heat index', value: formatTemp(day.heat_index_max, 0) },
    {
      label: 'Hot night',
      value: day.hot_night ? 'Yes' : 'No',
      tone: day.hot_night ? 'text-[var(--risk-4)]' : 'tapas-subtext',
    },
    {
      label: 'Consecutive hot days',
      value: `${day.consecutive_hot_days} ${
        day.consecutive_hot_days === 1 ? 'day' : 'days'
      }`,
    },
  ]

  return (
    <section aria-label="Key numbers">
      <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
        Key numbers
      </h3>
      <dl className="mt-1.5 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border p-2"
          >
            <dt className="text-[11px] tapas-subtext">{item.label}</dt>
            <dd
              className={cn(
                'mt-0.5 flex items-center gap-1 text-sm font-semibold',
                item.tone,
              )}
            >
              {item.label === 'Hot night' && day.hot_night ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function HapTriggers({ level }: { level: WardRisk['risk_level'] }) {
  const actions = hapTriggers(level)

  return (
    <section aria-label="Recommended actions">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide tapas-subtext">
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        Recommended actions for this ward
      </h3>
      <ul className="mt-1.5 space-y-1" data-testid="hap-triggers">
        {actions.map((action) => (
          <li key={action} className="flex gap-2 text-xs leading-relaxed">
            <span aria-hidden="true" className="tapas-subtext">
              •
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] tapas-subtext">
        Derived from the ward risk level under the city Heat Action Plan.
      </p>
    </section>
  )
}

function AdvisoryText({
  language,
  text,
}: {
  language: Language
  text: string | undefined
}) {
  if (!text) {
    return (
      <p className="text-xs tapas-subtext">
        No advisory has been issued for this ward and day. Advisories are
        generated at level 4 and above.
      </p>
    )
  }

  return (
    <div>
      <p
        lang={language}
        className="whitespace-pre-line rounded-md border border-border p-2.5 text-sm leading-relaxed"
      >
        {text}
      </p>
      {language !== 'en' ? (
        <p className="mt-1.5 text-[11px] tapas-subtext">
          {TRANSLATION_DISCLAIMER}
        </p>
      ) : null}
    </div>
  )
}
