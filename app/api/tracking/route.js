import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// Haversine formula — calculate miles between two GPS points
function calcMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, driver_id, lat, lng, speed, accuracy, trip_id, state, state_miles } = body

    if (action === 'start_trip') {
      const { data, error } = await supabaseAdmin
        .from('driver_trips')
        .insert({ driver_id, status: 'active', last_lat: lat, last_lng: lng, last_seen: new Date().toISOString() })
        .select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data)
    }

    if (action === 'update_location') {
      // Get current trip to calculate miles
      const { data: trip } = await supabaseAdmin
        .from('driver_trips').select('*').eq('id', trip_id).single()

      let newMiles = trip?.total_miles || 0
      if (trip?.last_lat && trip?.last_lng) {
        const delta = calcMiles(trip.last_lat, trip.last_lng, lat, lng)
        if (delta < 0.5) newMiles += delta // ignore GPS jumps > 0.5 mile
      }

      // Save location point
      await supabaseAdmin.from('driver_locations').insert({
        driver_id, trip_id, lat, lng, speed, accuracy
      })

      // Update trip
      await supabaseAdmin.from('driver_trips').update({
        total_miles: newMiles,
        last_lat: lat,
        last_lng: lng,
        last_seen: new Date().toISOString(),
        ...(state && { state }),
        ...(state_miles && { state_miles }),
      }).eq('id', trip_id)

      return NextResponse.json({ miles: newMiles })
    }

    if (action === 'end_trip') {
      const { data } = await supabaseAdmin
        .from('driver_trips')
        .update({ status: 'ended', end_time: new Date().toISOString() })
        .eq('id', trip_id).select().single()
      return NextResponse.json(data)
    }

    if (action === 'panic') {
      // Get driver info
      const { data: driver } = await supabaseAdmin
        .from('drivers').select('*').eq('id', driver_id).single()

      // Send urgent message to admin
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`
      await supabaseAdmin.from('messages').insert({
        content: `🚨 PANIC ALERT — ${driver?.name} needs immediate help!\nLocation: ${mapsUrl}\nTime: ${new Date().toLocaleString()}`,
        sender_id: driver_id,
        sender_role: 'driver',
        recipient_id: null,
        is_read: false,
      })
      // Push ALL devices
      try {
        const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*')
        const webpush = await import('web-push')
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          webpush.default.setVapidDetails('mailto:admin@smithsfreight.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
          const payload = JSON.stringify({ title: '🚨 PANIC ALERT', body: `${driver?.name} needs help!`, url: '/admin/messages' })
          for (const sub of subs || []) {
            try { await webpush.default.sendNotification(sub.subscription, payload) } catch {}
          }
        }
      } catch(e) { console.error('Panic push failed:', e) }

      // Update last location
      if (trip_id) {
        await supabaseAdmin.from('driver_trips').update({
          last_lat: lat, last_lng: lng, last_seen: new Date().toISOString()
        }).eq('id', trip_id)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')

    if (driver_id) {
      const { data } = await supabaseAdmin
        .from('driver_trips')
        .select('*')
        .eq('driver_id', driver_id)
        .order('start_time', { ascending: false })
        .limit(10)
      return NextResponse.json(data || [])
    }

    // Get all active drivers with last location
    const { data } = await supabaseAdmin
      .from('driver_trips')
      .select('*, drivers(name, truck_number, phone)')
      .eq('status', 'active')
      .order('last_seen', { ascending: false })

    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
