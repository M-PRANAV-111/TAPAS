import { NextResponse } from 'next/server'
import { DEMO_PATIENT_SIGNALS, DEMO_HEALTHCARE_FACILITIES } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const patient_signal = DEMO_PATIENT_SIGNALS[id] || DEMO_PATIENT_SIGNALS['ward-42-kukatpally']
  const facilities = DEMO_HEALTHCARE_FACILITIES[id] || DEMO_HEALTHCARE_FACILITIES['ward-42-kukatpally'] || []

  return NextResponse.json({
    ward_id: id,
    patient_signal,
    facilities,
    is_demo: true,
    warning: 'SIMULATED DATA — Demonstration health facility indicators',
    updated_at: new Date().toISOString(),
  })
}
