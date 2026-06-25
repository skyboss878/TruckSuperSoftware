import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  const { data, error } = await supabaseAdmin
    .from('company_settings')
    .select('*')
    .eq('company_id', ctx.company_id)
    .single()
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || {})
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const body = await request.json()
    const { data: existing } = await supabaseAdmin
      .from('company_settings')
      .select('id')
      .eq('company_id', ctx.company_id)
      .single()
    let result
    if (existing?.id) {
      result = await supabaseAdmin.from('company_settings')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single()
    } else {
      result = await supabaseAdmin.from('company_settings')
        .insert({ ...body, company_id: ctx.company_id })
        .select().single()
    }
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
    return NextResponse.json(result.data)
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
