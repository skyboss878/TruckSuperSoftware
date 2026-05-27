import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const auth_id   = searchParams.get('auth_id')

    // If auth_id provided, look up driver first
    if (auth_id) {
      const { data: driver } = await supabaseAdmin
        .from('drivers').select('*').eq('auth_id', auth_id).single()
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
      const { data, error } = await supabaseAdmin
        .from('dot_compliance').select('*')
        .eq('driver_id', driver.id).order('expiry_date', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ driver, records: data || [] })
    }

    // Admin: fetch all or filter by driver_id
    let query = supabaseAdmin
      .from('dot_compliance')
      .select('*, drivers(name)')
      .order('expiry_date', { ascending: true })
    if (driver_id) query = query.eq('driver_id', driver_id)

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
    const { driver_id, record_type, status, issue_date, expiry_date, result, notes } = body
    if (!driver_id || !record_type) {
      return NextResponse.json({ error: 'driver_id and record_type required' }, { status: 400 })
    }
    const payload = { driver_id, record_type, status: status || 'valid' }
    if (issue_date)  payload.issue_date  = issue_date
    if (expiry_date) payload.expiry_date = expiry_date
    if (result)      payload.result      = result
    if (notes)       payload.notes       = notes

    const { data, error } = await supabaseAdmin
      .from('dot_compliance').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
