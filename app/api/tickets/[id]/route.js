import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('*, drivers(*)')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    // Notify driver when ticket approved or rejected
    if (updates.status === 'approved' || updates.status === 'rejected') {
      try {
        const msg = updates.status === 'approved'
          ? `✅ Your ticket has been approved!`
          : `❌ Your ticket was rejected`
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://smiths-dnxx.vercel.app'}/api/push`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: data.driver_id,
            title: "Ticket Update",
            body: msg,
            url: '/driver',
          }),
        }).catch(() => {})
      } catch {}
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
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