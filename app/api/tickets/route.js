import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const status    = searchParams.get('status')
    const source    = searchParams.get('source')
    const start     = searchParams.get('start')
    const end       = searchParams.get('end')

    let query = supabaseAdmin
      .from('tickets')
      .select('*, drivers(name)')
      .eq('company_id', ctx.company_id)
      .order('created_at', { ascending: false })

    if (driver_id) query = query.eq('driver_id', driver_id)
    if (status)    query = query.eq('status', status)
    if (source)    query = query.eq('source', source)
    if (start)     query = query.gte('date', start)
    if (end)       query = query.lte('date', end)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()
    const { auth_id, driver_id: directDriverId, source = 'driver', ...ticketData } = body

    let driverId = directDriverId
    if (!driverId) {
      if (!auth_id) return NextResponse.json({ error: 'auth_id or driver_id required' }, { status: 400 })
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('drivers').select('*').eq('auth_id', auth_id).eq('company_id', ctx.company_id).single()
      if (driverError || !driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
      driverId = driver.id
    }

    const status = source === 'dispatch' ? 'assigned' : (ticketData.status || 'started')

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert({ ...ticketData, driver_id: driverId, source, status, company_id: ctx.company_id })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    if (source === 'dispatch') {
      await supabaseAdmin.from('messages').insert({
        content: `📋 New load assigned to you: ${ticketData.customer_name || 'Load'} — ${ticketData.location_loaded || ''} → ${ticketData.location_delivered || ''}. Check your Tickets tab.`,
        sender_id: driverId,
        sender_role: 'admin',
        recipient_id: driverId,
        is_read: false,
        company_id: ctx.company_id,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('tickets').update(updates).eq('id', id).eq('company_id', ctx.company_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
