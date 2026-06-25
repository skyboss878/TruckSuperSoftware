import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await requireSuperAdmin(request)
  if (ctx.error) return ctx.error

  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ companies: [] })
    return NextResponse.json({ companies: data || [] })
  } catch (err) {
    return NextResponse.json({ companies: [] })
  }
}

export async function PATCH(request) {
  const ctx = await requireSuperAdmin(request)
  if (ctx.error) return ctx.error

  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
