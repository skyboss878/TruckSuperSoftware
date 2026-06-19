import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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

async function notifyMatchingCarriers(load) {
  try {
    const { data: carriers } = await supabaseAdmin
      .from('carrier_profiles')
      .select('*, companies(name, email)')
      .eq('verified', true)

    if (!carriers?.length) return

    const matches = carriers.filter(c => {
      const specialtyMatch = !c.specialty?.length || c.specialty.includes(load.equipment_type)
      const stateMatch = !c.operating_states?.length ||
        c.operating_states.includes(load.pickup_state) ||
        c.operating_states.includes(load.delivery_state)
      return specialtyMatch && stateMatch && c.companies?.email
    })

    if (!matches.length) return

    const resend = new Resend(process.env.RESEND_API_KEY)
    const rate = load.flat_rate ? `$${load.flat_rate} flat` : load.rate_per_mile ? `$${load.rate_per_mile}/mi` : 'Negotiable'

    await Promise.allSettled(matches.map(c =>
      resend.emails.send({
        from: 'TruckSuperSoftware <onboarding@resend.dev>',
        to: c.companies.email,
        subject: `New load match: ${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#2D7A5F;">New Load Available</h2>
            <p><strong>${load.title}</strong></p>
            <p>${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}</p>
            <p>Equipment: ${load.equipment_type} &nbsp;|&nbsp; Rate: ${rate} &nbsp;|&nbsp; Pickup: ${load.pickup_date}</p>
            <p><a href="https://truck-super-software.vercel.app/loads/${load.id}" style="background:#2D7A5F;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Load</a></p>
          </div>
        `
      })
    ))
  } catch (err) {
    console.error('[Load Notify] Error matching/notifying carriers:', err)
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

    notifyMatchingCarriers(data).catch(err => console.error('[Load Notify] Unhandled error:', err))

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
