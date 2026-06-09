import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { pin } = await request.json()
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 })

    const { data: admins, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, role, status')
      .eq('pin', pin.trim())
      .eq('status', 'active')

    if (error || !admins?.length) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const admin = admins[0]
    return NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, role: admin.role }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, role')
      .eq('status', 'active')
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
