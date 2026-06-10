import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const driver_id = searchParams.get('driver_id')
  let q = supabaseAdmin.from('driver_documents').select('*, drivers(name)').order('expiry_date', { ascending: true })
  if (driver_id) q = q.eq('driver_id', driver_id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const body = await request.json()
  const { driver_id, doc_type, file_url, file_name, expiry_date, notes } = body
  if (!driver_id || !doc_type) return NextResponse.json({ error: 'driver_id and doc_type required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('driver_documents').insert({
    driver_id, doc_type, file_url, file_name,
    expiry_date: expiry_date || null,
    notes: notes || null,
    status: expiry_date && new Date(expiry_date) < new Date() ? 'expired' : 'valid',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('driver_documents').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('driver_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
