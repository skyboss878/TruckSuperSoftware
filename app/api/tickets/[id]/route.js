import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function GET(request, { params }) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('*, drivers(*)')
      .eq('id', id)
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
      .from('tickets').update(body).eq('id', id).select('*, drivers(*)').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { error } = await supabaseAdmin.from('tickets').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}