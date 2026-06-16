import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (admin.role !== 'super_admin') return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

    const { name, pin, role } = await request.json()
    if (!name || !pin) return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 })
    if (pin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({ name, pin, role: role || 'admin' })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (admin.role !== 'super_admin') return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Prevent deleting super admins
    const { data: target } = await supabaseAdmin.from('admins').select('role').eq('id', id).single()
    if (target?.role === 'super_admin') return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 403 })

    const { error } = await supabaseAdmin.from('admins').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
