import { MORTALITY_CITATION } from '@/lib/constants'
import type { RiskLevel } from '@/lib/types'
import { RISK_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface DeathsDisplayProps {
  value: number
  low: number
  high: number
  /** Tints the headline number; defaults to the level-4 red. */
  level?: RiskLevel
  /** "today" by default — the panel passes "on Thu" for other days. */
  when?: string
  /** Hide the citation line where it is already shown once nearby. */
  showCitation?: boolean
  className?: string
}

/**
 * Expected excess deaths.
 *
 * The interval is not decoration. A death count without its uncertainty reads
 * as a measurement rather than a model output, so this component never renders
 * the central estimate on its own — the range and the source are part of the
 * number. Fractions are never shown either: "0.4 deaths" is not a thing a
 * commissioner can act on.
 */
export function DeathsDisplay({
  value,
  low,
  high,
  level = 4,
  when = 'today',
  showCitation = true,
  className,
}: DeathsDisplayProps) {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0)
  const central = safe(value)
  const lower = Math.min(safe(low), central)
  const upper = Math.max(safe(high), central)

  // Below half a death the honest statement is "we do not expect one", not a
  // rounded-to-zero body count.
  if (central < 0.5 && lower < 0.5) {
    return (
      <div className={cn('space-y-1', className)} data-testid="deaths-display">
        <p className="text-base font-semibold text-foreground">
          Low risk — excess mortality not expected
        </p>
        <p className="text-xs tapas-subtext">
          Modelled excess is below one death for this ward-day.
        </p>
        {showCitation ? <Citation /> : null}
      </div>
    )
  }

  const displayValue = Math.round(central)
  const displayLow = Math.floor(lower)
  const displayHigh = Math.ceil(upper)

  return (
    <div className={cn('space-y-1', className)} data-testid="deaths-display">
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className="text-3xl font-bold leading-none"
          style={{ color: RISK_COLORS[level] }}
        >
          {displayValue}
        </span>
        <span className="text-sm tapas-subtext">
          expected extra {displayValue === 1 ? 'death' : 'deaths'} {when}
        </span>
      </p>
      <p className="text-xs tapas-subtext">
        (range {displayLow}–{displayHigh}, 90% CI)
      </p>
      {showCitation ? <Citation /> : null}
    </div>
  )
}

function Citation() {
  return (
    <p className="text-xs italic tapas-subtext">{MORTALITY_CITATION}</p>
  )
}

/**
 * One-line variant for the 5-day strip and the ranking list, where there is no
 * room for the full block. Still range-first: it says "~6 (4–9)", never "6".
 */
export function DeathsInline({
  value,
  low,
  high,
  className,
}: {
  value: number
  low: number
  high: number
  className?: string
}) {
  const central = Number.isFinite(value) ? value : 0
  if (central < 0.5 && low < 0.5) {
    return (
      <span className={cn('text-[11px] tapas-subtext', className)}>
        no excess expected
      </span>
    )
  }
  return (
    <span className={cn('text-[11px] tapas-subtext', className)}>
      ~{Math.round(central)} extra ({Math.floor(Math.min(low, central))}–
      {Math.ceil(Math.max(high, central))})
    </span>
  )
}
