import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

async function askAI(system, user, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const data = await res.json()
  return data.content?.find(c => c.type === 'text')?.text || ''
}

async function messageDriver(driver_id, content) {
  await supabaseAdmin.from('messages').insert({
    content, sender_id: 'system', sender_role: 'admin',
    recipient_id: driver_id, is_read: false,
  })
}

async function loadData() {
  const [
    { data: tickets }, { data: drivers }, { data: timesheets },
    { data: maintenance }, { data: compliance }, { data: trips },
  ] = await Promise.all([
    supabaseAdmin.from('tickets').select('*, drivers(name, id)').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('drivers').select('*').order('name'),
    supabaseAdmin.from('timesheets').select('*, drivers(name)').order('date', { ascending: false }).limit(100),
    supabaseAdmin.from('maintenance').select('*, drivers(name)').eq('status', 'open'),
    supabaseAdmin.from('dot_compliance').select('*, drivers(name)').order('expiry_date', { ascending: true }),
    supabaseAdmin.from('driver_trips').select('*, drivers(name, truck_number)').eq('status', 'active'),
  ])
  return { tickets, drivers, timesheets, maintenance, compliance, trips }
}

async function autoReview() {
  const { tickets } = await loadData()
  const submitted = tickets?.filter(t => t.status === 'submitted') || []
  if (submitted.length === 0) return { action: 'auto_review', reviewed: 0, approved: 0, flagged: 0, results: [] }

  const results = []
  for (const ticket of submitted) {
    const driverName = ticket.drivers?.name || 'Unknown'
    const issues = []
    if (!ticket.bol_number?.trim()) issues.push('missing BOL number')
    if (!ticket.bol_signature_url) issues.push('missing signature')
    if (!ticket.customer_name?.trim()) issues.push('missing customer name')
    if (!ticket.location_loaded?.trim()) issues.push('missing load location')
    if (!ticket.boxes?.length) issues.push('no boxes/weight recorded')
    if (!ticket.date) issues.push('missing date')

    if (issues.length === 0) {
      await supabaseAdmin.from('tickets').update({ status: 'approved' }).eq('id', ticket.id)
      const msg = await askAI(
        'You are a friendly freight dispatch assistant. Write a brief approval notification. Warm and encouraging. 2-3 sentences max.',
        `Ticket approved for driver ${driverName}. Load: ${ticket.load_id || 'N/A'}, Customer: ${ticket.customer_name}, Date: ${ticket.date}.`
      )
      await messageDriver(ticket.driver_id, msg)
      results.push({ ticket_id: ticket.id, load_id: ticket.load_id, driver: driverName, action: 'approved', issues: [] })
    } else {
      await supabaseAdmin.from('tickets').update({ status: 'started' }).eq('id', ticket.id)
      const msg = await askAI(
        'You are a freight dispatch assistant. Write a clear message to a driver explaining their ticket was returned due to missing paperwork. List issues clearly. Be respectful. Under 100 words.',
        `Ticket returned for ${driverName}. Load: ${ticket.load_id || 'N/A'}. Missing: ${issues.join(', ')}.`
      )
      await messageDriver(ticket.driver_id, msg)
      results.push({ ticket_id: ticket.id, load_id: ticket.load_id, driver: driverName, action: 'flagged', issues })
    }
  }
  return { action: 'auto_review', reviewed: submitted.length, approved: results.filter(r => r.action === 'approved').length, flagged: results.filter(r => r.action === 'flagged').length, results }
}

async function paperworkScan() {
  const { tickets } = await loadData()
  const active = tickets?.filter(t => ['started', 'submitted'].includes(t.status)) || []
  const flagged = []
  for (const ticket of active) {
    const issues = []
    if (!ticket.bol_number?.trim()) issues.push('BOL number')
    if (!ticket.bol_signature_url) issues.push('signature')
    if (!ticket.customer_name?.trim()) issues.push('customer name')
    if (!ticket.location_loaded?.trim()) issues.push('load location')
    if (!ticket.boxes?.length) issues.push('weight/boxes')
    if (issues.length > 0) flagged.push({ ticket_id: ticket.id, load_id: ticket.load_id || 'N/A', driver: ticket.drivers?.name || 'Unknown', driver_id: ticket.driver_id, status: ticket.status, missing: issues })
  }
  return { action: 'paperwork_scan', scanned: active.length, flagged_count: flagged.length, flagged }
}

async function morningBriefing() {
  const { tickets, drivers, maintenance, compliance, trips } = await loadData()
  const today = new Date().toISOString().split('T')[0]
  const stats = {
    active_drivers: drivers?.filter(d => d.status === 'active').length || 0,
    on_road: trips?.length || 0,
    pending_review: tickets?.filter(t => t.status === 'submitted').length || 0,
    todays_tickets: tickets?.filter(t => t.date === today).length || 0,
    open_maintenance: maintenance?.length || 0,
    expiring_compliance: compliance?.filter(c => c.expiry_date && Math.floor((new Date(c.expiry_date) - new Date()) / 86400000) <= 30).length || 0,
  }
  const submitted = tickets?.filter(t => t.status === 'submitted') || []
  const dataStr = `FLEET STATUS ${new Date().toLocaleDateString()}:
Active drivers: ${stats.active_drivers} | On road: ${stats.on_road} | Pending review: ${stats.pending_review}
Today tickets: ${stats.todays_tickets} | Open maintenance: ${stats.open_maintenance} | Expiring compliance: ${stats.expiring_compliance}
Drivers on road: ${trips?.map(t => t.drivers?.name).join(', ') || 'none'}
Pending: ${submitted.map(t => t.drivers?.name + ' Load ' + (t.load_id || 'N/A')).join(', ') || 'none'}
Maintenance: ${maintenance?.map(m => m.drivers?.name + ': ' + m.issue).join(', ') || 'none'}
Expiring: ${compliance?.filter(c => c.expiry_date && Math.floor((new Date(c.expiry_date) - new Date()) / 86400000) <= 30).map(c => c.drivers?.name + ' ' + c.record_type + ' ' + c.expiry_date).join(', ') || 'none'}`

  const summary = await askAI(
    `You are an AI dispatch assistant for Smith's Freight Hub. Generate a clear morning operations briefing with emojis. Sections: Fleet Status, Action Required, Compliance Alerts, Priority of the day. Specific with numbers and names. Under 300 words.`,
    dataStr, 800
  )
  return { action: 'morning_briefing', summary, stats }
}

async function broadcastMessage(topic) {
  const { drivers } = await loadData()
  const active = drivers?.filter(d => d.status === 'active') || []
  const msg = await askAI(
    'You are a freight dispatch manager. Write a professional broadcast message to all drivers. Concise and direct. Under 80 words.',
    `Write a broadcast message about: ${topic}`
  )
  for (const driver of active) await messageDriver(driver.id, `BROADCAST: ${msg}`)
  return { action: 'broadcast', message: msg, sent_to: active.length, drivers: active.map(d => d.name) }
}

async function fullAuto() {
  const [review, scan, briefing] = await Promise.all([autoReview(), paperworkScan(), morningBriefing()])
  return { action: 'full_auto', review, scan, briefing }
}

export async function POST(request) {
  try {
    const { action, topic } = await request.json()
    switch (action) {
      case 'auto_review':      return NextResponse.json(await autoReview())
      case 'paperwork_scan':   return NextResponse.json(await paperworkScan())
      case 'morning_briefing': return NextResponse.json(await morningBriefing())
      case 'broadcast':        return NextResponse.json(await broadcastMessage(topic || 'General update'))
      case 'full_auto':        return NextResponse.json(await fullAuto())
      default:                 return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('Dispatch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
