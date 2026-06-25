import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { data, error } = await supabaseAdmin
      .from('factoring_records')
      .select('*')
      .eq('company_id', ctx.company_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const totalAdvanced = (data || []).reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0)
    const totalFees = (data || []).reduce((s, r) => s + parseFloat(r.factoring_fee_amount || 0), 0)
    const pending = (data || []).filter(r => r.status === 'advanced').length

    return NextResponse.json({ records: data || [], totalAdvanced, totalFees, pending })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()
    const { ticket_id, driver_id, invoice_amount, advance_rate = 95, factoring_fee_pct = 3, broker_name, broker_payment_days, notes } = body
    if (!invoice_amount) return NextResponse.json({ error: 'invoice_amount required' }, { status: 400 })

    const inv = parseFloat(invoice_amount)
    const advance_amount = inv * (parseFloat(advance_rate) / 100)
    const factoring_fee_amount = inv * (parseFloat(factoring_fee_pct) / 100)
    const reserve_amount = inv - advance_amount - factoring_fee_amount

    const { data, error } = await supabaseAdmin
      .from('factoring_records')
      .insert({
        company_id: ctx.company_id,
        date: new Date().toISOString().split('T')[0],
        ticket_id: ticket_id || null,
        driver_id: driver_id || null,
        invoice_amount: inv,
        advance_rate: parseFloat(advance_rate),
        advance_amount,
        factoring_fee_pct: parseFloat(factoring_fee_pct),
        factoring_fee_amount,
        reserve_amount,
        broker_name,
        broker_payment_days: parseInt(broker_payment_days) || 30,
        status: 'submitted',
        notes
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { id, status } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const updates = { status }
    if (status === 'advanced') updates.advanced_at = new Date().toISOString()
    if (status === 'collected') updates.collected_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('factoring_records')
      .update(updates)
      .eq('id', id)
      .eq('company_id', ctx.company_id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
