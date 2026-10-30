export const maxDuration = 60

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import crypto from 'crypto'

const REQUIRED = ['customer_name', 'location_delivered', 'po_number', 'afe_number', 'sand_type', 'quantity', 'unit', 'bol_signed_by']

const SYSTEM = 'You extract an oilfield hauling delivery ticket from a driver voice-note transcript. Return ONLY a JSON object, no markdown, with keys: customer_name, location_loaded, location_delivered, po_number, afe_number, bol_number, sand_type (the product: frac sand type, brine, fresh water, etc), quantity (number), unit (bbl, ton, load, etc), bol_signed_by, arrival_time (ISO 8601), departed_time (ISO 8601), delivered_at (ISO 8601), notes. Use null for anything not clearly stated. Never guess or invent values. Resolve relative times like "14:00" using the recorded-at date and the America/Los_Angeles timezone.'

function isoOrNull(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const form = await request.formData()
    const audio = form.get('audio')
    const meta = JSON.parse(String(form.get('meta') || '{}'))
    if (!audio || typeof audio === 'string') {
      return NextResponse.json({ error: 'audio required' }, { status: 400 })
    }

    // Retry safety: same client_id never creates a second ticket
    const clientId = meta.client_id || null
    if (clientId) {
      const { data: dup } = await supabaseAdmin.from('tickets')
        .select('id, missing')
        .eq('company_id', ctx.company_id)
        .eq('parsed->>client_id', clientId)
        .maybeSingle()
      if (dup) return NextResponse.json({ id: dup.id, missing: dup.missing || [], duplicate: true })
    }

    const { data: driver } = await supabaseAdmin.from('drivers')
      .select('id, truck_number, trailer_number')
      .eq('auth_id', ctx.user.id)
      .eq('company_id', ctx.company_id)
      .maybeSingle()

    const buf = Buffer.from(await audio.arrayBuffer())
    const ext = (audio.type || '').includes('mp4') ? 'mp4' : 'webm'
    const audioPath = ctx.company_id + '/' + crypto.randomUUID() + '.' + ext
    const up = await supabaseAdmin.storage.from('ticket-audio')
      .upload(audioPath, buf, { contentType: audio.type || 'audio/webm' })
    if (up.error) return NextResponse.json({ error: 'audio upload failed' }, { status: 500 })

    // Transcribe
    const tf = new FormData()
    tf.append('file', new Blob([buf], { type: audio.type || 'audio/webm' }), 'note.' + ext)
    tf.append('model', 'whisper-1')
    tf.append('prompt', 'Oilfield hauling delivery: frac sand, brine, fresh water, bbl, tons, lease, AFE number, PO number, BOL.')
    const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: tf,
    })
    if (!tr.ok) return NextResponse.json({ error: 'transcription failed' }, { status: 502 })
    const { text: transcript } = await tr.json()

    // Parse
    const recordedIso = new Date(meta.ts || Date.now()).toISOString()
    const cr = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content: 'Recorded at: ' + recordedIso + '\nTranscript: ' + transcript }],
      }),
    })
    if (!cr.ok) return NextResponse.json({ error: 'parse failed' }, { status: 502 })
    const out = await cr.json()
    const raw = out.content?.[0]?.text || '{}'
    let p
    try { p = JSON.parse(raw.replace(/```json|```/g, '').trim()) }
    catch { p = {} }

    const qty = p.quantity == null ? null : Number(p.quantity)
    p.quantity = Number.isFinite(qty) ? qty : null
    const missing = REQUIRED.filter(k => p[k] == null || p[k] === '')

    const row = {
      company_id: ctx.company_id,
      driver_id: driver?.id || null,
      source: 'voice',
      status: 'started',
      date: meta.date || recordedIso.slice(0, 10),
      truck_number: driver?.truck_number || null,
      trailer_number: driver?.trailer_number || null,
      customer_name: p.customer_name || null,
      location_loaded: p.location_loaded || null,
      location_delivered: p.location_delivered || null,
      po_number: p.po_number || null,
      afe_number: p.afe_number || null,
      bol_number: p.bol_number || null,
      sand_type: p.sand_type || null,
      quantity: p.quantity,
      unit: p.unit || null,
      bol_signed_by: p.bol_signed_by || null,
      arrival_time: isoOrNull(p.arrival_time),
      departed_time: isoOrNull(p.departed_time),
      delivered_at: isoOrNull(p.delivered_at),
      notes: p.notes || null,
      transcript,
      parsed: { ...p, client_id: clientId },
      missing,
      audio_path: audioPath,
      lat: meta.lat ?? null,
      lng: meta.lng ?? null,
      recorded_at: recordedIso,
    }

    const { data, error } = await supabaseAdmin.from('tickets').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ id: data.id, missing, ticket: data })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
