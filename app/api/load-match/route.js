import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { driver_id, current_location, hours_available, equipment_type } = await request.json()

    // Get available loads
    const { data: loads } = await supabaseAdmin
      .from('loads')
      .select('*')
      .eq('status', 'open')
      .limit(20)

    if (!loads?.length) return NextResponse.json({ matches: [], message: 'No loads available' })

    // Get driver profile
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('id', driver_id)
      .single()

    // AI scoring
    const prompt = `You are a trucking load matching AI. Score these loads for this driver.

DRIVER:
- Location: ${current_location || 'Unknown'}
- Hours available: ${hours_available || 11}
- Equipment: ${equipment_type || driver?.equipment_type || 'dry_van'}
- Truck #: ${driver?.truck_number}

AVAILABLE LOADS:
${loads.map((l, i) => `
${i+1}. ID: ${l.id}
   Route: ${l.pickup_city}, ${l.pickup_state} → ${l.delivery_city}, ${l.delivery_state}
   Miles: ${l.estimated_miles || 'unknown'}
   Rate: ${l.flat_rate ? '$'+l.flat_rate+' flat' : l.rate_per_mile ? '$'+l.rate_per_mile+'/mi' : 'negotiable'}
   Equipment: ${l.equipment_type}
   Pickup: ${l.pickup_date}
   Weight: ${l.weight_lbs ? l.weight_lbs+' lbs' : 'unknown'}
   Commodity: ${l.commodity || 'general freight'}
`).join('')}

Return JSON only — array of top 5 matches:
[{"load_id":"...","score":95,"reason":"Short deadhead, great rate","estimated_pay":1200,"recommendation":"TAKE IT"}]
Score 0-100. Reason max 10 words.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    let matches = []
    try {
      const text = response.content[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const scored = JSON.parse(clean)
      
      // Attach full load data to matches
      matches = scored.map(m => ({
        ...m,
        load: loads.find(l => l.id === m.load_id)
      })).filter(m => m.load)
    } catch {
      matches = loads.slice(0, 5).map(l => ({
        load_id: l.id,
        score: 75,
        reason: 'Available load',
        recommendation: 'REVIEW',
        load: l
      }))
    }

    return NextResponse.json({ matches, total_available: loads.length })
  } catch (err) {
    console.error('Load match error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
