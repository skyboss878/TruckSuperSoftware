import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    let query = supabaseAdmin
      .from('timesheets')
      .select('*, drivers(name)')
      .order('date', { ascending: false })
    const start = searchParams.get('start')
    const end   = searchParams.get('end')
    if (driver_id) query = query.eq('driver_id', driver_id)
    if (start)     query = query.gte('date', start)
    if (end)       query = query.lte('date', end)
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
    const { auth_id, ...tsData } = body
    const { data: driver } = await supabaseAdmin
      .from('drivers').select('id').eq('auth_id', auth_id).single()
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    const { data, error } = await supabaseAdmin
      .from('timesheets').insert({ ...tsData, driver_id: driver.id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('timesheets').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('timesheets').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
