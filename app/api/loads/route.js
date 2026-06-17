import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const equipment = searchParams.get('equipment')
    const status = searchParams.get('status') || 'open'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabaseAdmin
      .from('loads')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (state) query = query.or(`pickup_state.eq.${state},delivery_state.eq.${state}`)
    if (equipment) query = query.eq('equipment_type', equipment)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      company_name, contact_name, contact_phone, contact_email,
      title, load_type, equipment_type, weight_lbs, commodity,
      pickup_location, pickup_city, pickup_state, pickup_date, pickup_time,
      delivery_location, delivery_city, delivery_state, delivery_date,
      rate_per_mile, flat_rate, rate_negotiable, estimated_miles,
      special_instructions, dot_required, hazmat_required, twic_required
    } = body

    if (!company_name || !title || !pickup_location || !delivery_location || !pickup_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('loads')
      .insert({
        company_name, contact_name, contact_phone, contact_email,
        title, load_type, equipment_type, weight_lbs, commodity,
        pickup_location, pickup_city, pickup_state, pickup_date, pickup_time,
        delivery_location, delivery_city, delivery_state, delivery_date,
        rate_per_mile, flat_rate, rate_negotiable, estimated_miles,
        special_instructions, dot_required, hazmat_required, twic_required,
        status: 'open'
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('loads').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
