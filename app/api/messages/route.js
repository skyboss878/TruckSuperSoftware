import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { searchParams } = new URL(request.url)
    const driver_id = searchParams.get('driver_id')
    const user_id = searchParams.get('user_id')

    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .eq('company_id', ctx.company_id)
      .order('created_at', { ascending: true })

    if (driver_id) {
      // Admin fetching thread with specific driver
      query = query.or(`recipient_id.eq.${driver_id},and(sender_id.eq.${driver_id},sender_role.eq.driver),recipient_id.is.null`)
    } else if (user_id) {
      // Driver fetching their inbox
      query = query.or(`recipient_id.eq.${user_id},recipient_id.is.null`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()
    const { content, sender_id, sender_role, recipient_id } = body

    if (!content || !sender_id || !sender_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({ content, sender_id, sender_role, recipient_id: recipient_id || null, company_id: ctx.company_id })
      .select()
      .single()

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
    const body = await request.json()
    const { message_ids } = body

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .in('id', message_ids)
      .eq('company_id', ctx.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
