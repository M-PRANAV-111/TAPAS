import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DeathsDisplay } from '@/components/risk/DeathsDisplay'

describe('DeathsDisplay', () => {
  it('shows the central estimate with its 90% range', () => {
    render(<DeathsDisplay value={6} low={4} high={9} />)

    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText(/expected extra deaths today/)).toBeInTheDocument()
    expect(screen.getByText(/range 4–9/)).toBeInTheDocument()
    expect(screen.getByText(/90% CI/)).toBeInTheDocument()
  })

  it('never shows a bare number without the interval', () => {
    const { container } = render(<DeathsDisplay value={6} low={4} high={9} />)

    // Whatever else changes, the range must be on screen next to the number.
    expect(container.textContent).toMatch(/range \d+–\d+/)
  })

  it('rounds the estimate and widens the interval outwards', () => {
    render(<DeathsDisplay value={6.4} low={4.7} high={8.2} />)

    expect(screen.getByText('6')).toBeInTheDocument()
    // floor(4.7) = 4, ceil(8.2) = 9 — never narrower than the model said.
    expect(screen.getByText(/range 4–9/)).toBeInTheDocument()
  })

  it('says no excess is expected rather than reporting zero deaths', () => {
    render(<DeathsDisplay value={0.1} low={0} high={0.3} />)

    expect(
      screen.getByText(/Low risk — excess mortality not expected/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/expected extra deaths/)).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('cites the source study in every non-zero case', () => {
    const cases = [
      { value: 1, low: 0, high: 3 },
      { value: 6, low: 4, high: 9 },
      { value: 14.2, low: 9.1, high: 21.6 },
    ]

    for (const props of cases) {
      const { unmount } = render(<DeathsDisplay {...props} />)
      expect(screen.getByText(/de Bont et al\./)).toBeInTheDocument()
      unmount()
    }
  })

  it('keeps the singular reading honest for a single death', () => {
    render(<DeathsDisplay value={1} low={0} high={2} />)

    expect(screen.getByText(/expected extra death today/)).toBeInTheDocument()
    expect(screen.getByText(/range 0–2/)).toBeInTheDocument()
  })

  it('clamps an inverted interval from the backend instead of rendering it', () => {
    render(<DeathsDisplay value={6} low={9} high={4} />)

    expect(screen.getByText(/range 6–6/)).toBeInTheDocument()
  })
})
