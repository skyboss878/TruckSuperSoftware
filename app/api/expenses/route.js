import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear()
    const category = searchParams.get('category')
    const driver_id = searchParams.get('driver_id')

    let query = supabaseAdmin
      .from('expenses')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false })

    if (category) query = query.eq('category', category)
    if (driver_id) query = query.eq('driver_id', driver_id)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const total = (data || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const byCategory = (data || []).reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0)
      return acc
    }, {})

    return NextResponse.json({ expenses: data || [], total, byCategory })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { date, category, amount, description, vendor, driver_id, truck_number, state, gallons, notes, ticket_id } = body
    if (!category || !amount) return NextResponse.json({ error: 'category and amount required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        date: date || new Date().toISOString().split('T')[0],
        category, amount: parseFloat(amount),
        description, vendor,
        driver_id: driver_id || null,
        truck_number, state,
        gallons: gallons ? parseFloat(gallons) : null,
        tax_deductible: true,
        notes,
        ticket_id: ticket_id || null
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('expenses').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
