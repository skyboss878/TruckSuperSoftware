import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext, requireRole } from '@/lib/auth-helpers'

const REQUIRED = ['customer_name', 'location_delivered', 'po_number', 'afe_number', 'sand_type', 'quantity', 'unit', 'bol_signed_by']
const EDITABLE = [...REQUIRED, 'location_loaded', 'bol_number', 'notes']

export async function PATCH(request, { params }) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { id } = await params
    const { fields = {}, submit = false } = await request.json()

    const { data: t } = await supabaseAdmin.from('tickets').select('*')
      .eq('id', id).eq('company_id', ctx.company_id).eq('source', 'voice').maybeSingle()
    if (!t) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    if (t.status !== 'started') return NextResponse.json({ error: 'Already submitted' }, { status: 409 })

    const { data: driver } = await supabaseAdmin.from('drivers').select('id')
      .eq('auth_id', ctx.user.id).eq('company_id', ctx.company_id).maybeSingle()
    const isOwner = driver && t.driver_id === driver.id
    const denied = isOwner ? null : requireRole(ctx, ['admin', 'owner', 'dispatcher', 'superadmin'])
    if (denied) return denied

    const update = {}
    for (const k of EDITABLE) {
      if (!(k in fields)) continue
      let v = fields[k]
      if (typeof v === 'string') v = v.trim()
      if (v === '' || v == null) v = null
      else if (k === 'quantity') { v = Number(v); if (!Number.isFinite(v)) v = null }
      update[k] = v
    }
    const merged = { ...t, ...update }
    update.missing = REQUIRED.filter(k => merged[k] == null || merged[k] === '')
    if (submit) update.status = 'submitted'

    const { data, error } = await supabaseAdmin.from('tickets').update(update)
      .eq('id', id).eq('company_id', ctx.company_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ticket: data, missing: data.missing || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
