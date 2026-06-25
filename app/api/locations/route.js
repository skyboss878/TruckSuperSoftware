import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext, requireRole } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  const { data, error } = await supabaseAdmin.from('locations').select('*').eq('company_id', ctx.company_id).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  const roleError = requireRole(ctx, ['owner', 'admin'])
  if (roleError) return roleError

  const { name } = await request.json()
  const cleanName = name?.trim()
  if (!cleanName) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').insert({ name: cleanName, active: true, company_id: ctx.company_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  const roleError = requireRole(ctx, ['owner', 'admin'])
  if (roleError) return roleError

  const { id, active } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('locations').update({ active }).eq('id', id).eq('company_id', ctx.company_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
