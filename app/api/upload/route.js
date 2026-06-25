import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const ticket_id = formData.get('ticket_id')
    const type = formData.get('type') || 'photo' // photo | signature
    const caption = formData.get('caption') || ''
    const uploaded_by = formData.get('uploaded_by') || null

    if (!file || !ticket_id) {
      return NextResponse.json({ error: 'file and ticket_id required' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name?.split('.').pop() || 'jpg'
    const path = `${type}s/${ticket_id}/${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { data: upload, error: uploadError } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ticket-attachments')
      .getPublicUrl(path)

    if (type === 'signature') {
      // Save signature URL directly on ticket
      await supabaseAdmin.from('tickets')
        .update({ bol_signature_url: publicUrl })
        .eq('id', ticket_id)
      return NextResponse.json({ url: publicUrl })
    }

    // Save photo record
    const { data, error } = await supabaseAdmin
      .from('ticket_photos')
      .insert({ ticket_id, url: publicUrl, caption, uploaded_by })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ url: publicUrl, photo: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticket_id = searchParams.get('ticket_id')
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('ticket_photos')
      .select('*')
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
