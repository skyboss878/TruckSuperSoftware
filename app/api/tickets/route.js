import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const status    = searchParams.get('status')

    let query = supabaseAdmin
      .from('tickets')
      .select('*, drivers(name)')
      .order('created_at', { ascending: false })

    if (driver_id) query = query.eq('driver_id', driver_id)
    if (status)    query = query.eq('status', status)

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
    const { auth_id, ...ticketData } = body

    if (!auth_id) return NextResponse.json({ error: 'auth_id required' }, { status: 400 })

    // Look up driver by auth_id
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('drivers').select('*').eq('auth_id', auth_id).single()

    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert({ ...ticketData, driver_id: driver.id })
      .select()
      .single()

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
      .from('tickets').update(updates).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
