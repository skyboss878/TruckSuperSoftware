import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()
    const { name, email, phone, license_number, truck_number, trailer_number } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Use Supabase invite — sends branded email with magic link
    // Driver clicks link, sets their own password, lands on dashboard
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://truck-super-software.vercel.app/setup-password',
      data: {
        name,
        company_id: ctx.company_id,
        role: 'driver',
      }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const auth_id = authData.user.id

    const { error: dbError } = await supabaseAdmin.from('drivers').insert({
      name, email, phone, license_number, truck_number, trailer_number,
      auth_id, status: 'active',
      company_id: ctx.company_id,
      must_change_password: false,
    })

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(auth_id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    try {
      await supabaseAdmin.from('company_users').insert({
        company_id: ctx.company_id,
        user_id: auth_id,
        role: 'driver',
        name, email, phone,
      })
    } catch (_) {}

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/drivers]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { searchParams } = new URL(request.url)
    const auth_id = searchParams.get('auth_id')

    if (auth_id) {
      const { data, error } = await supabaseAdmin.from('drivers').select('*')
        .eq('auth_id', auth_id).eq('company_id', ctx.company_id).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data)
    }

    const status_filter = searchParams.get('status')
    let query = supabaseAdmin.from('drivers').select('*')
      .eq('company_id', ctx.company_id).order('name')
    if (status_filter) query = query.eq('status', status_filter)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
