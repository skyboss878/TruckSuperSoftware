import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

async function getData() {
  const [
    { data: drivers },
    { data: tickets },
    { data: timesheets },
    { data: maintenance },
    { data: compliance },
  ] = await Promise.all([
    supabaseAdmin.from('drivers').select('*').order('name'),
    supabaseAdmin.from('tickets').select('*, drivers(name)').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('timesheets').select('*, drivers(name)').order('date', { ascending: false }).limit(200),
    supabaseAdmin.from('maintenance').select('*, drivers(name)').order('created_at', { ascending: false }),
    supabaseAdmin.from('dot_compliance').select('*, drivers(name)').order('expiry_date', { ascending: true }),
  ])
  return { drivers, tickets, timesheets, maintenance, compliance }
}

export async function POST(request) {
  try {
    const { messages } = await request.json()
    const db = await getData()

    // Build driver name lookup
    const driverMap = {}
    db.drivers?.forEach(d => { driverMap[d.id] = d.name })

    const systemPrompt = `You are an AI assistant for Smith's Freight Hub trucking company. You have access to live database data. Answer questions clearly and specifically. When showing tickets, always include: date, customer, driver name, load ID, location, status, and weight. Format numbers cleanly.

DRIVERS (${db.drivers?.length || 0}):
${db.drivers?.map(d => `- ${d.name} | Email: ${d.email} | Truck: ${d.truck_number || 'N/A'} | Trailer: ${d.trailer_number || 'N/A'} | Status: ${d.status}`).join('\n') || 'None'}

TICKETS (${db.tickets?.length || 0} total):
${db.tickets?.map(t => {
  const weight = t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0) || 0
  return `- Date: ${t.date} | Driver: ${t.drivers?.name || driverMap[t.driver_id] || 'Unknown'} | Customer: ${t.customer_name || 'N/A'} | Load: ${t.load_id || 'N/A'} | BOL: ${t.bol_number || 'N/A'} | Location: ${t.location_loaded || 'N/A'} | Status: ${t.status} | Weight: ${weight}t | Boxes: ${t.boxes?.length || 0}`
}).join('\n') || 'None'}

TIMESHEETS (${db.timesheets?.length || 0}):
${db.timesheets?.map(ts => {
  const miles = ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0
  return `- Date: ${ts.date} | Driver: ${ts.drivers?.name || driverMap[ts.driver_id] || 'Unknown'} | Type: ${ts.log_type} | Hours: ${ts.start_time} - ${ts.end_time || 'ongoing'} | Miles: ${miles} | Status: ${ts.status}`
}).join('\n') || 'None'}

MAINTENANCE (${db.maintenance?.length || 0}):
${db.maintenance?.map(m => `- Driver: ${m.drivers?.name || 'Unknown'} | Issue: ${m.issue} | Severity: ${m.severity} | Status: ${m.status}`).join('\n') || 'None'}

DOT COMPLIANCE (${db.compliance?.length || 0}):
${db.compliance?.map(c => {
  const days = c.expiry_date ? Math.floor((new Date(c.expiry_date) - new Date()) / 86400000) : null
  return `- Driver: ${c.drivers?.name || 'Unknown'} | Type: ${c.record_type} | Status: ${c.status} | Expires: ${c.expiry_date || 'N/A'} | Days left: ${days !== null ? days : 'N/A'}`
}).join('\n') || 'None'}

Today: ${new Date().toLocaleDateString()}

IMPORTANT: When the user asks to "show" tickets or data, list them out clearly with all details. Never just say "Done." Always provide the actual data. If asked for a CSV or export, format the data as a CSV table in your response wrapped in \`\`\`csv code blocks.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
      }),
    })

    const data = await response.json()
    if (!data.content) {
      console.error('Anthropic error:', JSON.stringify(data))
      return NextResponse.json({ reply: 'AI Error: ' + (data.error?.message || data.type || JSON.stringify(data)), messages })
    }
    const reply = data.content?.find(c => c.type === 'text')?.text || 'Sorry, no response.'

    return NextResponse.json({
      reply,
      messages: [...messages, { role: 'assistant', content: reply }],
    })
  } catch (err) {
    console.error('Assistant error:', err)
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}
