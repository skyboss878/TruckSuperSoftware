import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, phone, license_number, truck_number, trailer_number, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    // Create auth user with service role (bypasses RLS)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const auth_id = authData.user.id

    // Insert driver record with service role (bypasses RLS)
    const { error: dbError } = await supabaseAdmin.from('drivers').insert({
      name,
      email,
      phone,
      license_number,
      truck_number,
      trailer_number,
      auth_id,
      status: 'active',
    })

    if (dbError) {
      // Rollback auth user if driver insert fails
      await supabaseAdmin.auth.admin.deleteUser(auth_id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('drivers').select('*').order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
