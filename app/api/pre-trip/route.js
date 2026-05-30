import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    if (!driver_id) return NextResponse.json({ error: 'driver_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('pre_trip_inspections')
      .select('*')
      .eq('driver_id', driver_id)
      .eq('inspection_date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ completed: !!data, record: data || null })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { driver_id, truck_number, items, defects_found, overall_status, notes } = body
    if (!driver_id || !items) {
      return NextResponse.json({ error: 'driver_id and items required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Upsert so duplicate submits don't error
    const { data, error } = await supabaseAdmin
      .from('pre_trip_inspections')
      .upsert({
        driver_id,
        truck_number,
        inspection_date: today,
        items,
        defects_found: defects_found || false,
        overall_status: overall_status || 'pass',
        notes: notes || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'driver_id,inspection_date' })
      .select()
      .single()

    if (error) { console.error('Pre-trip upsert error:', error); return NextResponse.json({ error: error.message }, { status: 400 }) }

    // If defects found, also log to dot_compliance table
    if (defects_found) {
      await supabaseAdmin.from('dot_compliance').insert({
        driver_id,
        record_type: 'pre_trip_defect',
        status: 'needs_attention',
        notes: `Pre-trip defects found on ${today}: ${notes || 'See inspection record'}`,
        issue_date: today,
      }) } catch(e) { console.error('dot_compliance log failed:', e) }
    }

    return NextResponse.json({ success: true, record: data })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
