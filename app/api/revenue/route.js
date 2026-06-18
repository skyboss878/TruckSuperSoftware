import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear()

    const { data, error } = await supabaseAdmin
      .from('revenue_records')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const total = (data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const pending = (data || []).filter(r => r.payment_status === 'pending').reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const collected = (data || []).filter(r => r.payment_status === 'paid').reduce((s, r) => s + parseFloat(r.amount || 0), 0)

    return NextResponse.json({ records: data || [], total, pending, collected })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { date, source, amount, description, driver_id, ticket_id, miles, origin_state, destination_state, broker_name, payment_status } = body
    if (!amount) return NextResponse.json({ error: 'amount required' }, { status: 400 })

    const net_amount = parseFloat(amount) - parseFloat(body.factoring_fee || 0)

    const { data, error } = await supabaseAdmin
      .from('revenue_records')
      .insert({
        date: date || new Date().toISOString().split('T')[0],
        source: source || 'load',
        amount: parseFloat(amount),
        net_amount,
        description,
        driver_id: driver_id || null,
        ticket_id: ticket_id || null,
        miles: miles ? parseFloat(miles) : null,
        origin_state,
        destination_state,
        broker_name,
        payment_status: payment_status || 'pending'
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
