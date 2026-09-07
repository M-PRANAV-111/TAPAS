import type { RiskLevel } from '@/lib/types'

// NDMA National Guidelines, Annexure 4; NCDC/IMD for emergency recognition.
export const HEALTH_GUIDANCE_SOURCE = 'https://nidm.gov.in/PDF/pubs/NDMA/27.pdf'
export const HEAT_FIRST_AID_SOURCE = 'https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf'
export const EMERGENCY_SOURCE = 'https://112.gov.in/'
export type GuidanceAudience = 'everyone' | 'older-adults' | 'children' | 'outdoor-workers'

/** Editorial prioritisation of official general precautions, not a clinical threshold or government alert. */
export function heatPrecautions(riskLevel: RiskLevel | null | undefined, audience: GuidanceAudience): string[] {
  const basics = ['Carry drinking water and drink regularly, even before you feel thirsty.', 'Choose light, loose clothing and cover your head when outdoors.']
  const rising = ['Plan outdoor activity for cooler morning or evening hours.', 'Rest in shade or a cool indoor space; avoid strenuous afternoon activity.']
  const severe = ['Limit heat exposure and move to a cool or shaded place.', 'Check on people who may need help with drinking water and cooling.']
  const actions = riskLevel && riskLevel >= 4 ? [...severe, ...rising, ...basics] : riskLevel && riskLevel >= 2 ? [...rising, ...basics] : [...basics, rising[0]]
  if (audience === 'older-adults') actions.unshift('Check daily on older or unwell people living alone; seek medical advice if they feel unwell.')
  if (audience === 'children') actions.unshift('Never leave a child in a parked vehicle; keep children out of direct heat.')
  if (audience === 'outdoor-workers') actions.unshift('Arrange shade, drinking water and more rest breaks. Move strenuous work to cooler hours.')
  return actions
}
