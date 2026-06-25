import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { Resend } from 'resend'

// resend initialized lazily inside handler

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { invoice_id } = await request.json()
    const [{ data: invoice }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('invoices').select('*').eq('id', invoice_id).single(),
      supabaseAdmin.from('company_settings').select('*').single(),
    ])
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (!invoice.customer_email) return NextResponse.json({ error: 'No customer email' }, { status: 400 })
    const resend = new Resend(process.env.RESEND_API_KEY)
    const co = settings || {}
    const rows = (invoice.line_items || []).map(i => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${i.description||''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.qty||1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${Number(i.rate||0).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">$${Number((i.qty||1)*(i.rate||0)).toFixed(2)}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f7fa;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#2D7A5F;padding:36px 40px;">
    ${co.logo_url?`<img src="${co.logo_url}" height="52" style="margin-bottom:16px;border-radius:6px;display:block;" alt="logo">`:''}
    <div style="color:white;font-size:26px;font-weight:900;letter-spacing:-0.5px;">${co.company_name||"TruckSuperSoftware"}</div>
    <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">${[co.address,co.city,co.state,co.zip].filter(Boolean).join(', ')}</div>
  </div>
  <div style="padding:40px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
      <div>
        <div style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1.5px;margin-bottom:6px;">Invoice</div>
        <div style="font-size:36px;font-weight:900;color:#111;line-height:1;">${invoice.invoice_number}</div>
      </div>
      <div style="background:#FEF3C7;color:#D97706;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:1px;">${invoice.status.toUpperCase()}</div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;gap:24px;">
      <div>
        <div style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
        <div style="font-weight:700;color:#111;">${invoice.customer_name||'Customer'}</div>
        ${invoice.customer_address?`<div style="color:#666;font-size:13px;margin-top:2px;">${invoice.customer_address}</div>`:''}
        ${invoice.customer_email?`<div style="color:#666;font-size:13px;">${invoice.customer_email}</div>`:''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:6px;">Invoice Date</div>
        <div style="color:#333;">${new Date(invoice.created_at).toLocaleDateString()}</div>
        <div style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-top:12px;margin-bottom:6px;">Due Date</div>
        <div style="color:#D97706;font-weight:700;">${new Date(invoice.due_date).toLocaleDateString()}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f8f9fa;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;">Description</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;">Rate</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;padding-top:16px;">
      <div style="display:flex;justify-content:flex-end;padding:6px 0;font-size:14px;color:#555;"><span style="margin-right:48px;">Subtotal</span><span>$${Number(invoice.subtotal).toFixed(2)}</span></div>
      ${invoice.tax_rate>0?`<div style="display:flex;justify-content:flex-end;padding:6px 0;font-size:14px;color:#555;"><span style="margin-right:48px;">Tax (${invoice.tax_rate}%)</span><span>$${Number(invoice.tax_amount).toFixed(2)}</span></div>`:''}
      <div style="display:flex;justify-content:flex-end;padding:14px 0 6px;font-size:20px;font-weight:900;color:#2D7A5F;border-top:2px solid #2D7A5F;margin-top:8px;"><span style="margin-right:48px;">Total Due</span><span>$${Number(invoice.total).toFixed(2)}</span></div>
    </div>
    ${invoice.notes?`<div style="margin-top:24px;padding:16px;background:#f8f9fa;border-radius:10px;font-size:13px;color:#666;">${invoice.notes}</div>`:''}
    ${co.bank_account?`<div style="margin-top:24px;padding:18px;border:1px solid #e5e7eb;border-radius:10px;">
      <div style="font-size:11px;text-transform:uppercase;color:#999;letter-spacing:1px;margin-bottom:10px;">Payment Details</div>
      ${co.bank_name?`<div style="font-size:13px;color:#555;margin-bottom:4px;">Bank: <strong>${co.bank_name}</strong></div>`:''}
      <div style="font-size:13px;color:#555;margin-bottom:4px;">Account: <strong>${co.bank_account}</strong></div>
      ${co.bank_routing?`<div style="font-size:13px;color:#555;">Routing: <strong>${co.bank_routing}</strong></div>`:''}
    </div>`:''}
    <div style="margin-top:28px;font-size:12px;color:#aaa;text-align:center;">Payment Terms: ${invoice.payment_terms} · Questions? ${co.email||co.phone||'Contact us'}</div>
  </div>
  <div style="background:#f8f9fa;padding:20px 40px;border-top:1px solid #eee;font-size:12px;color:#aaa;">
    Thank you for your business — ${co.company_name||"TruckSuperSoftware"}
  </div>
</div></body></html>`

    const { error: emailError } = await resend.emails.send({
      from: `${co.company_name||"TruckSuperSoftware"} <dispatch@twsfleetcommand.com>`,
      to: invoice.customer_email,
      subject: `Invoice ${invoice.invoice_number} · $${Number(invoice.total).toFixed(2)} due ${new Date(invoice.due_date).toLocaleDateString()}`,
      html,
    })
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 400 })
    await supabaseAdmin.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoice_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send invoice error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
