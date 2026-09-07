'use client'

import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { RISK_COLORS } from '@/lib/constants'
import type { ForecastHour } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Point {
  idx: number
  time: string
  hour: number
  label: string
  utci: number
  baseline: number
  /** Height of the red wedge above the baseline; 0 when under it. */
  exceedance: number
}

function clockLabel(hour: number): string {
  if (hour === 0) return 'midnight'
  if (hour === 12) return 'noon'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

export interface UtciChartProps {
  hourly: ForecastHour[]
  /** Falls back to the per-hour baseline when the daily figure is absent. */
  baselineP97?: number
  className?: string
}

/**
 * 48-hour UTCI forecast against the ward's own climatology.
 *
 * The baseline is not optional furniture — a UTCI number means nothing without
 * it. 42°C is an ordinary May afternoon in one ward and a red alert in another,
 * and the gap between the two lines is the whole signal.
 */
export function UtciChart({ hourly, baselineP97, className }: UtciChartProps) {
  const data = useMemo<Point[]>(
    () =>
      hourly.map((h, idx) => {
        const date = new Date(h.time)
        const hour = Number.isNaN(date.getTime()) ? idx % 24 : date.getHours()
        const baseline = h.baseline_p97 || baselineP97 || 0
        return {
          idx,
          time: h.time,
          hour,
          label: clockLabel(hour),
          utci: h.utci,
          baseline,
          exceedance: Math.max(0, h.utci - baseline),
        }
      }),
    [hourly, baselineP97],
  )

  const ticks = useMemo(
    () => data.filter((d) => d.hour % 6 === 0).map((d) => d.idx),
    [data],
  )

  if (data.length === 0) {
    return (
      <p className={cn('text-xs tapas-subtext', className)}>
        Hourly forecast unavailable for this ward.
      </p>
    )
  }

  const values = data.flatMap((d) => [d.utci, d.baseline])
  const yMin = Math.floor(Math.min(...values) - 2)
  const yMax = Math.ceil(Math.max(...values) + 2)

  return (
    <div className={cn('w-full', className)} data-testid="utci-chart">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid stroke="#E9ECEF" vertical={false} />
          <XAxis
            dataKey="idx"
            type="number"
            domain={[0, data.length - 1]}
            ticks={ticks}
            tickFormatter={(idx: number) => data[idx]?.label ?? ''}
            tick={{ fontSize: 11, fill: '#566573' }}
            tickLine={false}
            axisLine={{ stroke: '#D5D8DC' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: '#566573' }}
            tickLine={false}
            axisLine={false}
            width={48}
            unit="°C"
          />
          <Tooltip content={<UtciTooltip />} />

          {/* Transparent pedestal + red wedge = the area between the forecast
              and the baseline, drawn only where the forecast is higher. */}
          <Area
            dataKey="baseline"
            stackId="gap"
            stroke="none"
            fill="none"
            fillOpacity={0}
            isAnimationActive={false}
            legendType="none"
          />
          <Area
            dataKey="exceedance"
            stackId="gap"
            stroke="none"
            fill={RISK_COLORS[4]}
            fillOpacity={0.22}
            isAnimationActive={false}
            legendType="none"
          />

          <Line
            dataKey="baseline"
            name="97th-percentile baseline"
            stroke="#8A939B"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="utci"
            name="UTCI forecast"
            stroke={RISK_COLORS[4]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] tapas-subtext">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundColor: RISK_COLORS[4] }}
          />
          UTCI forecast
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-[#8A939B]" />
          Ward 97th-percentile baseline (1991–2020)
        </span>
      </div>
    </div>
  )
}

interface TooltipPayloadItem {
  payload?: Point
}

function UtciTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  const delta = point.utci - point.baseline
  const above = delta > 0

  return (
    <div className="rounded-md border border-border bg-white px-2.5 py-2 shadow-md">
      <p className="text-xs font-semibold">{point.label}</p>
      <p className="mt-1 text-xs">
        UTCI <span className="font-semibold">{point.utci.toFixed(1)}°C</span>
      </p>
      <p className="text-[11px] tapas-subtext">
        Baseline {point.baseline.toFixed(1)}°C
      </p>
      <p
        className="mt-1 text-[11px] font-medium"
        style={{ color: above ? RISK_COLORS[4] : RISK_COLORS[1] }}
      >
        {above
          ? `${delta.toFixed(1)}°C above threshold`
          : `${Math.abs(delta).toFixed(1)}°C below threshold`}
      </p>
    </div>
  )
}
