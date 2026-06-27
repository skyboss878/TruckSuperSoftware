import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function GET(request, { params }) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('id', id)
      .eq('company_id', ctx.company_id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { id } = await params
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .update(body)
      .eq('id', id)
      .eq('company_id', ctx.company_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
