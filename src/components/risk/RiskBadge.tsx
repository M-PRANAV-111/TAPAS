import { RISK_COLORS, RISK_LABELS, RISK_TEXT_COLORS } from '@/lib/constants'
import type { RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

export type RiskBadgeSize = 'sm' | 'md' | 'lg'

const SIZES: Record<RiskBadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-1.5',
}

export interface RiskBadgeProps {
  level: RiskLevel
  size?: RiskBadgeSize
  /** Render only "Level N", for tight columns. */
  compact?: boolean
  /** Stretch to the width of the parent, used by the 5-day strip. */
  block?: boolean
  className?: string
}

/**
 * The one way a risk level is ever shown. Colour alone is not the signal — the
 * level number and its label always travel with it, so the badge still reads
 * correctly in greyscale, in print, and for colour-blind users.
 */
export function RiskBadge({
  level,
  size = 'md',
  compact = false,
  block = false,
  className,
}: RiskBadgeProps) {
  const label = RISK_LABELS[level]

  return (
    <span
      data-testid="risk-badge"
      data-level={level}
      aria-label={`Risk level ${level}, ${label}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold leading-none tracking-tight',
        SIZES[size],
        block && 'w-full rounded-md',
        className,
      )}
      style={{
        backgroundColor: RISK_COLORS[level],
        color: RISK_TEXT_COLORS[level],
      }}
    >
      {compact ? `Level ${level}` : `Level ${level} — ${label}`}
    </span>
  )
}

/** Small square used by the map legend and chart keys. */
export function RiskSwatch({
  level,
  className,
}: {
  level: RiskLevel
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3.5 w-3.5 rounded-sm', className)}
      style={{ backgroundColor: RISK_COLORS[level] }}
    />
  )
}
