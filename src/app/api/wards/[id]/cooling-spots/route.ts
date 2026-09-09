import { NextResponse } from 'next/server'
import { DEMO_COOLING_SPOTS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const spots = DEMO_COOLING_SPOTS[id] || []

  return NextResponse.json({
    ward_id: id,
    cooling_spots: spots,
    count: spots.length,
    is_demo: true,
    empty_state_reason:
      spots.length === 0
        ? 'No verified cooling-centre dataset available for this ward.'
        : undefined,
    source: 'Municipal Heat Action Plan & Ground Survey',
    updated_at: new Date().toISOString(),
  })
}
