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

    // Create slug from company name
    const slug = company_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create company record
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: company_name,
        slug: `${slug}-${Date.now()}`,
        contact_name, phone, email,
        address, city, state, zip,
        dot_number, mc_number,
        num_trucks: parseInt(num_trucks) || 1,
        equipment_types: equipment_types || [],
        primary_lanes, commodities,
        plan: plan || 'pro',
        plan_status: 'trial',
        rts_fuel_card: fuel_card || false,
        rts_factoring: factoring || false,
        onboarded: false,
      })
      .select()
      .single()

    if (companyError) console.error('Company create error:', companyError)

    // Also save to carrier_signups
    await supabaseAdmin.from('carrier_signups').insert({
      company_name, contact_name, phone, email,
      address, city, state, zip,
      dot_number, mc_number,
      num_trucks: parseInt(num_trucks) || 1,
      equipment_types: equipment_types || [],
      avg_miles_month: parseInt(avg_miles_month) || 0,
      primary_lanes, commodities,
      plan: plan || 'pro',
      fuel_card: fuel_card || false,
      factoring: factoring || false,
      status: 'pending_review',
      company_id: company?.id || null,
      signed_up_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true, company_id: company?.id })
  } catch (err) {
    console.error('Carrier signup error:', err)
    return NextResponse.json({ success: true })
  }
}
