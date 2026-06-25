import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customer_id = searchParams.get('customer_id')
    let query = supabaseAdmin.from('invoices').select('*').eq('company_id', ctx.company_id).order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (customer_id) query = query.eq('customer_id', customer_id)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const body = await request.json()
    const { data: settings } = await supabaseAdmin.from('company_settings').select('*').eq('company_id', ctx.company_id).maybeSingle()
    const prefix = settings?.invoice_prefix || 'SMF-'
    const num = settings?.next_invoice_number || 1
    const invoice_number = `${prefix}${String(num).padStart(4, '0')}`
    const lineItems = body.line_items || []
    const subtotal = lineItems.reduce((s, i) => s + ((i.qty || 1) * (i.rate || 0)), 0)
    const taxRate = body.tax_rate ?? settings?.tax_rate ?? 0
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    const terms = body.payment_terms || settings?.payment_terms || 'Net 30'
    const daysNet = parseInt(terms.replace(/\D/g, '')) || 30
    const due_date = new Date(Date.now() + daysNet * 86400000).toISOString().split('T')[0]
    const { data, error } = await supabaseAdmin.from('invoices').insert({
      company_id: ctx.company_id,
      invoice_number, customer_id: body.customer_id, customer_name: body.customer_name,
      customer_email: body.customer_email, customer_address: body.customer_address,
      ticket_id: body.ticket_id, driver_id: body.driver_id,
      line_items: lineItems, subtotal, tax_rate: taxRate, tax_amount: taxAmount,
      total, status: body.status || 'draft', payment_terms: terms, due_date, notes: body.notes,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (settings?.id) await supabaseAdmin.from('company_settings').update({ next_invoice_number: num + 1 }).eq('id', settings.id)
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
    const { id, ...updates } = body
    if (updates.line_items) {
      const subtotal = updates.line_items.reduce((s, i) => s + ((i.qty || 1) * (i.rate || 0)), 0)
      const taxAmount = subtotal * ((updates.tax_rate || 0) / 100)
      updates.subtotal = subtotal; updates.tax_amount = taxAmount; updates.total = subtotal + taxAmount
    }
    const { data, error } = await supabaseAdmin.from('invoices').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', ctx.company_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
