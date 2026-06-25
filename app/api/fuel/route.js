import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  const { data, error } = await supabaseAdmin
    .from('fuel_logs')
    .select('*')
    .eq('company_id', ctx.company_id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ fuel_logs: data })
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()

    const {
      driver_id,
      date,
      state,
      city,
      gallons,
      price_per_gallon,
      total_cost,
      odometer,
      notes
    } = body

    if (!driver_id || !date || !gallons) {
      return NextResponse.json(
        { error: 'driver_id, date, gallons required' },
        { status: 400 }
      )
    }

    const gallonsNum = Number(gallons)
    const priceNum = Number(price_per_gallon || 0)

    const computedCost =
      total_cost ?? (gallonsNum * priceNum)

    const { data, error } = await supabaseAdmin
      .from('fuel_logs')
      .insert([{
        driver_id,
        date,
        state,
        city,
        gallons: gallonsNum,
        price_per_gallon: priceNum,
        total_cost: computedCost,
        odometer,
        notes,
        company_id: ctx.company_id
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ fuel_log: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('fuel_logs')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
