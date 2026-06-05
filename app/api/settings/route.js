import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('company_settings').select('*').single()
    if (error) return NextResponse.json({}, { status: 200 })
    return NextResponse.json(data)
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data: existing } = await supabaseAdmin.from('company_settings').select('id').single()
    let result
    if (existing?.id) {
      result = await supabaseAdmin.from('company_settings').update({ ...body, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
    } else {
      result = await supabaseAdmin.from('company_settings').insert(body).select().single()
    }
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
    return NextResponse.json(result.data)
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
