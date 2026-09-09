'use client'

import { heatIndexBand } from '@/lib/thermal'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { HEALTH_GUIDANCE_SOURCE, HEAT_FIRST_AID_SOURCE, heatPrecautions, type GuidanceAudience } from '@/lib/content/precautions'
import type { RiskLevel } from '@/lib/types'

export function Precautions({ riskLevel, selectedDate, heatIndex }: { riskLevel?: RiskLevel | null; selectedDate?: string; heatIndex?:number|null }) {
  const band=heatIndexBand(heatIndex)
  const [audience, setAudience] = useState<GuidanceAudience>('everyone')
  return (
    <section aria-labelledby="precautions-heading" className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <h2 id="precautions-heading" className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />What should I do?</h2>
      <p className="mt-1 text-xs tapas-subtext">{band ? `General precautions prioritised for the calculated Heat Index category: ${band.label}.` : riskLevel ? `General precautions prioritised for the supplied Level ${riskLevel}${selectedDate ? ` on ${selectedDate}` : ''}.` : 'Local heat risk is unavailable. Keep these general heat precautions in mind.'} These are national reference precautions; follow applicable local warnings.</p>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">Advice for<select className="min-h-11 max-w-full rounded-md border border-border bg-card px-3 text-sm" value={audience} onChange={event => setAudience(event.target.value as GuidanceAudience)}>
        <option value="everyone">Everyone</option><option value="older-adults">Older adults and carers</option><option value="children">Children and families</option><option value="outdoor-workers">Outdoor workers</option>
      </select></label>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">{heatPrecautions(riskLevel ?? (band ? (band.severity>=3?4:2):null), audience).map(action => <li key={action}>{action}</li>)}</ul>
      <p className="mt-3 text-xs tapas-subtext">Sources: <a className="underline" href={HEALTH_GUIDANCE_SOURCE} target="_blank" rel="noopener noreferrer">NDMA heat-wave guidelines</a> and <a className="underline" href={HEAT_FIRST_AID_SOURCE} target="_blank" rel="noopener noreferrer">IMD heatwave guidance</a>. TAPAS does not determine a medically safe work duration from these tips.</p>
    </section>
  )
}
