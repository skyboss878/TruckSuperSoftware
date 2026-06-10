import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const driver_id = searchParams.get('driver_id')
  let q = supabaseAdmin.from('expenses').select('*, drivers(name)').order('date', { ascending: false })
  if (driver_id) q = q.eq('driver_id', driver_id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const body = await request.json()
  const { driver_id, date, type, amount, description, truck_number, receipt_url } = body
  if (!driver_id || !amount || !type) return NextResponse.json({ error: 'driver_id, type, amount required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('expenses').insert({
    driver_id, date: date || new Date().toISOString().split('T')[0],
    type, amount: parseFloat(amount), description, truck_number, receipt_url,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
