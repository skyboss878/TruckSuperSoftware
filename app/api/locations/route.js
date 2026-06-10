import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { logAdminAction, ACTIONS } from '@/lib/audit'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('locations').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await request.json()
  const cleanName = name?.trim()
  if (!cleanName) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').insert({ name: cleanName, active: true }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAdminAction({ admin_id: admin.admin_id, admin_name: admin.name, action: ACTIONS.LOCATION_ADDED, target_id: data.id, metadata: { name: cleanName } })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, active } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').update({ active }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAdminAction({ admin_id: admin.admin_id, admin_name: admin.name, action: ACTIONS.LOCATION_TOGGLED, target_id: id, metadata: { active } })
  return NextResponse.json(data)
}
