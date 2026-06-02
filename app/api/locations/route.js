import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function verifyAdmin(request) {
  const auth = request.headers.get('authorization')
  if (!auth) return false
  const token = auth.replace('Bearer ', '')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return false
  const { data: admin, error: adminError } = await supabaseAdmin.from('admins').select('id').eq('auth_id', userData.user.id).single()
  if (adminError || !admin) return false
  return true
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from('locations').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await request.json()
  const cleanName = name?.trim()
  if (!cleanName) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').insert({ name: cleanName }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, active } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (typeof active !== 'boolean') return NextResponse.json({ error: 'Active must be boolean' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').update({ active }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
