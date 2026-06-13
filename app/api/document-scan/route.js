export const maxDuration = 60

import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request) {
  try {
    const { image, media_type, driver_id } = await request.json()
    if (!image || !driver_id) {
      return NextResponse.json({ error: 'image and driver_id required' }, { status: 400 })
    }

    // Duplicate detection via hash
    const fileHash = crypto.createHash('sha256').update(image).digest('hex')
    const { data: existing } = await supabaseAdmin.from('scanned_documents')
      .select('id, doc_type, extracted_data, created_at')
      .eq('file_hash', fileHash)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        duplicate: true,
        existing_scan: existing,
      })
    }

    const systemPrompt = `You are a document scanner for a trucking company. You will be shown a photo of a document. First, classify it as one of: "fuel_receipt", "bol" (bill of lading), "scale_ticket", "invoice", or "other".

Then extract relevant fields based on the type:

- fuel_receipt: { gallons, price_per_gallon, total_amount, station_name, city, state, date, odometer }
- bol: { bol_number, shipper_name, consignee_name, pickup_location, delivery_location, weight, pieces, commodity_description, date }
- scale_ticket: { ticket_number, gross_weight, tare_weight, net_weight, location, date }
- invoice: { invoice_number, vendor_name, amount, description, date, due_date }
- other: { description, date, amount }

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "doc_type": "...",
  "extracted": { ...fields based on type above... },
  "confidence": { "overall": "high"|"medium"|"low", "<field1>": "high"|"medium"|"low", ... one entry per extracted field ... }
}

If a field is not visible or not applicable, use null for that field and "low" for its confidence. For dates, use YYYY-MM-DD format.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image } },
            { type: 'text', text: 'Classify and extract data from this document.' },
          ],
        }],
      }),
    })

    const data = await res.json()
    const text = data.content?.find(c => c.type === 'text')?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Could not parse scan result', raw: text }, { status: 500 })
    }

    // Upload image to Supabase Storage
    let image_url = null
    try {
      const buffer = Buffer.from(image, 'base64')
      const ext = (media_type || 'image/jpeg').split('/')[1] || 'jpg'
      const path = `${driver_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabaseAdmin.storage
        .from('scanned-documents')
        .upload(path, buffer, { contentType: media_type || 'image/jpeg' })
      if (!upErr) {
        const { data: pub } = supabaseAdmin.storage.from('scanned-documents').getPublicUrl(path)
        image_url = pub?.publicUrl || null
      }
    } catch (e) {
      console.error('Image upload failed:', e.message)
    }

    // Save scan record
    const { data: saved, error } = await supabaseAdmin.from('scanned_documents').insert({
      driver_id,
      doc_type: parsed.doc_type || 'other',
      extracted_data: parsed.extracted || {},
      confidence: parsed.confidence || {},
      image_url,
      file_hash: fileHash,
      status: 'pending',
    }).select().single()

    if (error) console.error('Failed to save scan record:', error.message)

    // Auto-create linked record based on doc type
    let autoCreated = null
    if (parsed.doc_type === 'fuel_receipt' && parsed.extracted) {
      const e = parsed.extracted
      const { data: fuelLog } = await supabaseAdmin.from('fuel_logs').insert({
        driver_id,
        gallons: e.gallons,
        price_per_gallon: e.price_per_gallon,
        total_amount: e.total_amount,
        station: e.station_name,
        city: e.city,
        state: e.state,
        date: e.date || new Date().toISOString().split('T')[0],
        odometer: e.odometer,
      }).select().single()
      autoCreated = fuelLog ? { table: 'fuel_logs', id: fuelLog.id } : null
    } else if (parsed.doc_type === 'invoice' && parsed.extracted) {
      const e = parsed.extracted
      const { data: expense } = await supabaseAdmin.from('expenses').insert({
        driver_id,
        type: 'invoice',
        amount: e.amount,
        description: `${e.vendor_name || 'Invoice'}${e.invoice_number ? ' #' + e.invoice_number : ''} - ${e.description || ''}`,
        date: e.date || new Date().toISOString().split('T')[0],
      }).select().single()
      autoCreated = expense ? { table: 'expenses', id: expense.id } : null
    }

    if (autoCreated && saved) {
      await supabaseAdmin.from('scanned_documents')
        .update({ linked_table: autoCreated.table, linked_id: autoCreated.id, status: 'confirmed' })
        .eq('id', saved.id)
    }

    return NextResponse.json({
      doc_type: parsed.doc_type,
      confidence: parsed.confidence,
      extracted: parsed.extracted,
      scan_id: saved?.id,
      image_url,
      auto_created: autoCreated,
    })
  } catch (err) {
    console.error('Document scan error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Confirm/edit a scan and link it to the appropriate record
export async function PATCH(request) {
  try {
    const { scan_id, linked_table, linked_id, status, extracted_data } = await request.json()
    const update = {}
    if (linked_table) update.linked_table = linked_table
    if (linked_id) update.linked_id = linked_id
    if (status) update.status = status
    if (extracted_data) update.extracted_data = extracted_data

    const { data, error } = await supabaseAdmin.from('scanned_documents')
      .update(update)
      .eq('id', scan_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const driver_id = searchParams.get('driver_id')
  let q = supabaseAdmin.from('scanned_documents').select('*').order('created_at', { ascending: false })
  if (driver_id) q = q.eq('driver_id', driver_id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}
