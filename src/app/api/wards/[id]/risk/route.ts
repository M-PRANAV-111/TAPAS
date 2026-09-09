import { NextResponse } from 'next/server'
import { DEMO_WARDS, DEMO_EXPLAINABLE_RISK } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const ward = DEMO_WARDS.find((w) => w.ward_id === id) || DEMO_WARDS[0]
  const breakdown = DEMO_EXPLAINABLE_RISK[id] || DEMO_EXPLAINABLE_RISK['ward-42-kukatpally']

  return NextResponse.json({
    ward,
    breakdown,
    is_demo: true,
    source: 'TAPAS Integrated Risk Model',
    generated_at: new Date().toISOString(),
  })
}
