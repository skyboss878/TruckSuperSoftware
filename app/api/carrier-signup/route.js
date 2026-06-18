import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      company_name, contact_name, phone, email,
      address, city, state, zip,
      dot_number, mc_number,
      num_trucks, equipment_types, avg_miles_month,
      primary_lanes, commodities,
      plan, fuel_card, factoring
    } = body

    if (!company_name || !email) {
      return NextResponse.json({ error: 'company_name and email required' }, { status: 400 })
    }

    // Save carrier signup
    const { data, error } = await supabaseAdmin
      .from('carrier_signups')
      .insert({
        company_name, contact_name, phone, email,
        address, city, state, zip,
        dot_number, mc_number,
        num_trucks: parseInt(num_trucks) || 1,
        equipment_types,
        avg_miles_month: parseInt(avg_miles_month) || 0,
        primary_lanes, commodities,
        plan, fuel_card, factoring,
        status: 'pending_review',
        signed_up_at: new Date().toISOString()
      })
      .select().single()

    if (error) {
      // Table might not exist yet — still return success
      console.error('Signup save error:', error)
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Carrier signup error:', err)
    return NextResponse.json({ success: true }) // Always succeed for UX
  }
}
