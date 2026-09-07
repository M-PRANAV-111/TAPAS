'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  WBGT_BANDS,
  WBGT_BAND_ORDER,
  WBGT_TLV,
  wbgtBand,
} from '@/lib/constants'
import type { OccupationalHour } from '@/lib/types'
import { cn, hourLabel } from '@/lib/utils'

interface Bar24 extends OccupationalHour {
  label: string
}

export interface WbgtChartProps {
  hourly: OccupationalHour[]
  className?: string
}

/**
 * Hourly WBGT for one ward-day, banded by the ACGIH work/rest thresholds.
 *
 * Bar colour is the recommendation: a supervisor should be able to read the
 * day's schedule off the chart without reading a number.
 */
export function WbgtChart({ hourly, className }: WbgtChartProps) {
  const data = useMemo<Bar24[]>(
    () =>
      hourly.map((h) => ({
        ...h,
        band: h.band ?? wbgtBand(h.wbgt),
        label: hourLabel(h.hour),
      })),
    [hourly],
  )

  if (data.length === 0) {
    return (
      <p className={cn('text-sm tapas-subtext', className)}>
        No WBGT forecast available for this ward and day.
      </p>
    )
  }

  const maxWbgt = Math.max(...data.map((d) => d.wbgt), WBGT_TLV + 2)

  return (
    <div className={cn('w-full', className)} data-testid="wbgt-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#E9ECEF" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#566573' }}
            tickLine={false}
            axisLine={{ stroke: '#D5D8DC' }}
            interval={1}
          />
          <YAxis
            domain={[0, Math.ceil(maxWbgt + 2)]}
            tick={{ fontSize: 11, fill: '#566573' }}
            tickLine={false}
            axisLine={false}
            width={48}
            unit="°C"
          />
          <Tooltip cursor={{ fill: 'rgba(28,40,51,0.05)' }} content={<WbgtTooltip />} />
          <ReferenceLine
            y={WBGT_TLV}
            stroke="#1C2833"
            strokeDasharray="6 4"
            strokeWidth={1.25}
            label={{
              value: `ACGIH TLV ${WBGT_TLV}°C`,
              // Early-morning bars sit below the line, so the label has clear
              // space at the left and never lands on top of a bar.
              position: 'insideTopLeft',
              fill: '#1C2833',
              fontSize: 11,
            }}
          />
          <Bar dataKey="wbgt" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={WBGT_BANDS[entry.band].color}
                aria-label={`${entry.label}, ${entry.wbgt} degrees, ${entry.band}`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] tapas-subtext">
        {WBGT_BAND_ORDER.map((band) => (
          <li key={band} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: WBGT_BANDS[band].color }}
              aria-hidden="true"
            />
            <span>
              <span className="font-medium text-foreground">
                {WBGT_BANDS[band].label}
              </span>{' '}
              — {WBGT_BANDS[band].note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WbgtTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: Bar24 }[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  const band = WBGT_BANDS[point.band]
  return (
    <div className="rounded-md border border-border bg-white px-2.5 py-2 shadow-md">
      <p className="text-xs font-semibold">{point.label}</p>
      <p className="mt-1 text-xs">
        WBGT <span className="font-semibold">{point.wbgt.toFixed(1)}°C</span>
      </p>
      <p className="text-[11px] font-medium" style={{ color: band.color }}>
        {band.label}
      </p>
      <p className="text-[11px] tapas-subtext">
        {point.work_pct}% work / {point.rest_pct}% rest
      </p>
    </div>
  )
}
