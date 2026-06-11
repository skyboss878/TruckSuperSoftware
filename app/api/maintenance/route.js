import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const id = searchParams.get('id')
    let query = supabaseAdmin
      .from('maintenance')
      .select('*, drivers(name)')
      .order('created_at', { ascending: false })
    if (id) query = query.eq('id', id)
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
    const { auth_id, ...mData } = body
    const { data: driver } = await supabaseAdmin
      .from('drivers').select('id').eq('auth_id', auth_id).single()
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    const { data, error } = await supabaseAdmin
      .from('maintenance').insert({ ...mData, driver_id: driver.id }).select().single()
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
      .from('maintenance').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
