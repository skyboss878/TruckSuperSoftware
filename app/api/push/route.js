import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import webpush from 'web-push'



// Save push subscription for a driver
export async function POST(request) {
  try {
    const { driver_id, subscription } = await request.json()
    if (!driver_id || !subscription) {
      return NextResponse.json({ error: 'driver_id and subscription required' }, { status: 400 })
    }

    await supabaseAdmin
      .from('push_subscriptions')
      .upsert({ driver_id, subscription }, { onConflict: 'driver_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Send push to a specific driver or all drivers
export async function PUT(request) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:admin@smithsfreight.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }

  try {
    const { driver_id, title, body, url } = await request.json()

    let query = supabaseAdmin.from('push_subscriptions').select('*')
    if (driver_id) query = query.eq('driver_id', driver_id)

    const { data: subs } = await query
    if (!subs?.length) return NextResponse.json({ sent: 0 })

    const payload = JSON.stringify({ title, body, url: url || '/driver' })
    let sent = 0

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err) {
        // Subscription expired — remove it
        if (err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
        console.error('Push failed:', err.message)
      }
    }

    return NextResponse.json({ sent })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
