import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

const tools = [
  {
    name: 'get_drivers',
    description: 'Get all drivers or filter by status. Use this for any question about drivers.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: active or inactive' },
      }
    }
  },
  {
    name: 'get_tickets',
    description: 'Get tickets. Filter by driver name, status, date range, or customer.',
    input_schema: {
      type: 'object',
      properties: {
        driver_name: { type: 'string' },
        status: { type: 'string', description: 'started, submitted, approved, rejected' },
        start_date: { type: 'string', description: 'YYYY-MM-DD' },
        end_date: { type: 'string', description: 'YYYY-MM-DD' },
        customer_name: { type: 'string' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'get_timesheets',
    description: 'Get timesheets and miles. Filter by driver name or date range.',
    input_schema: {
      type: 'object',
      properties: {
        driver_name: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'get_maintenance',
    description: 'Get maintenance issues. Filter by status or driver.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'open, in_progress, resolved' },
        driver_name: { type: 'string' }
      }
    }
  },
  {
    name: 'get_compliance',
    description: 'Get DOT compliance records. Find expired or expiring records.',
    input_schema: {
      type: 'object',
      properties: {
        driver_name: { type: 'string' },
        status: { type: 'string' },
        expiring_within_days: { type: 'number', description: 'Find records expiring within N days' }
      }
    }
  },
  {
    name: 'get_earnings',
    description: 'Calculate driver earnings for a period based on miles and loads.',
    input_schema: {
      type: 'object',
      required: ['driver_name'],
      properties: {
        driver_name: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        rate_per_mile: { type: 'number', description: 'Default 0.55' },
        rate_per_load: { type: 'number', description: 'Default 150' }
      }
    }
  },
  {
    name: 'get_fleet_summary',
    description: 'Get a high-level fleet summary: active drivers, tickets today, pending approvals, open maintenance, compliance alerts.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'approve_ticket',
    description: 'Approve a specific ticket by ID or load number.',
    input_schema: {
      type: 'object',
      required: ['ticket_id'],
      properties: {
        ticket_id: { type: 'string' }
      }
    }
  },
  {
    name: 'send_message',
    description: 'Send a message to a specific driver or broadcast to all drivers.',
    input_schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string' },
        driver_name: { type: 'string', description: 'Leave empty to broadcast to all' }
      }
    }
  },
  {
    name: 'export_csv',
    description: 'Generate a CSV export of tickets, timesheets, or earnings for a driver/period.',
    input_schema: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', description: 'tickets, timesheets, or earnings' },
        driver_name: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' }
      }
    }
  }
]

async function runTool(name, input) {
  switch (name) {

    case 'get_drivers': {
      let q = supabaseAdmin.from('drivers').select('*').order('name')
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      return data || []
    }

    case 'get_tickets': {
      let q = supabaseAdmin.from('tickets').select('*, drivers(name)').order('created_at', { ascending: false }).limit(input.limit || 50)
      if (input.status) q = q.eq('status', input.status)
      if (input.start_date) q = q.gte('date', input.start_date)
      if (input.end_date) q = q.lte('date', input.end_date)
      if (input.customer_name) q = q.ilike('customer_name', `%${input.customer_name}%`)
      const { data } = await q
      let results = data || []
      if (input.driver_name) {
        results = results.filter(t => t.drivers?.name?.toLowerCase().includes(input.driver_name.toLowerCase()))
      }
      return results
    }

    case 'get_timesheets': {
      let q = supabaseAdmin.from('timesheets').select('*, drivers(name)').order('date', { ascending: false }).limit(input.limit || 50)
      if (input.start_date) q = q.gte('date', input.start_date)
      if (input.end_date) q = q.lte('date', input.end_date)
      const { data } = await q
      let results = data || []
      if (input.driver_name) {
        results = results.filter(t => t.drivers?.name?.toLowerCase().includes(input.driver_name.toLowerCase()))
      }
      return results
    }

    case 'get_maintenance': {
      let q = supabaseAdmin.from('maintenance').select('*, drivers(name)').order('created_at', { ascending: false })
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      let results = data || []
      if (input.driver_name) {
        results = results.filter(m => m.drivers?.name?.toLowerCase().includes(input.driver_name.toLowerCase()))
      }
      return results
    }

    case 'get_compliance': {
      let q = supabaseAdmin.from('dot_compliance').select('*, drivers(name)').order('expiry_date', { ascending: true })
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      let results = data || []
      if (input.driver_name) {
        results = results.filter(c => c.drivers?.name?.toLowerCase().includes(input.driver_name.toLowerCase()))
      }
      if (input.expiring_within_days) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + input.expiring_within_days)
        results = results.filter(c => c.expiry_date && new Date(c.expiry_date) <= cutoff)
      }
      return results
    }

    case 'get_earnings': {
      const { data: drivers } = await supabaseAdmin.from('drivers').select('*')
      const driver = drivers?.find(d => d.name.toLowerCase().includes(input.driver_name.toLowerCase()))
      if (!driver) return { error: `Driver "${input.driver_name}" not found` }

      let tq = supabaseAdmin.from('timesheets').select('*').eq('driver_id', driver.id)
      let tkq = supabaseAdmin.from('tickets').select('*').eq('driver_id', driver.id).eq('status', 'approved')
      if (input.start_date) { tq = tq.gte('date', input.start_date); tkq = tkq.gte('date', input.start_date) }
      if (input.end_date) { tq = tq.lte('date', input.end_date); tkq = tkq.lte('date', input.end_date) }

      const [{ data: ts }, { data: tickets }] = await Promise.all([tq, tkq])
      const totalMiles = (ts || []).reduce((sum, t) =>
        sum + (t.state_miles?.reduce((s, m) => s + (parseFloat(m.miles) || 0), 0) || 0), 0)
      const ratePerMile = input.rate_per_mile || 0.55
      const ratePerLoad = input.rate_per_load || 150
      const milePay = totalMiles * ratePerMile
      const loadPay = (tickets || []).length * ratePerLoad
      return {
        driver: driver.name,
        period: `${input.start_date || 'all time'} to ${input.end_date || 'now'}`,
        approved_loads: (tickets || []).length,
        total_miles: parseFloat(totalMiles.toFixed(1)),
        mile_pay: parseFloat(milePay.toFixed(2)),
        load_pay: parseFloat(loadPay.toFixed(2)),
        total_pay: parseFloat((milePay + loadPay).toFixed(2)),
        rate_per_mile: ratePerMile,
        rate_per_load: ratePerLoad,
      }
    }

    case 'get_fleet_summary': {
      const today = new Date().toISOString().split('T')[0]
      const [
        { data: drivers },
        { data: todayTickets },
        { data: pending },
        { data: maintenance },
        { data: compliance },
        { data: activeTrips },
      ] = await Promise.all([
        supabaseAdmin.from('drivers').select('id, name, status'),
        supabaseAdmin.from('tickets').select('id').eq('date', today),
        supabaseAdmin.from('tickets').select('id, drivers(name), customer_name, load_id').eq('status', 'submitted'),
        supabaseAdmin.from('maintenance').select('id, issue, drivers(name)').eq('status', 'open'),
        supabaseAdmin.from('dot_compliance').select('*, drivers(name)').lte('expiry_date', new Date(Date.now() + 30*86400000).toISOString().split('T')[0]),
        supabaseAdmin.from('driver_trips').select('*, drivers(name, truck_number)').eq('status', 'active'),
      ])
      return {
        active_drivers: drivers?.filter(d => d.status === 'active').length || 0,
        total_drivers: drivers?.length || 0,
        drivers_on_road: activeTrips?.length || 0,
        drivers_on_road_names: activeTrips?.map(t => t.drivers?.name).join(', ') || 'none',
        tickets_today: todayTickets?.length || 0,
        pending_approval: pending?.length || 0,
        pending_tickets: pending?.map(t => `${t.drivers?.name} - ${t.customer_name} Load ${t.load_id || 'N/A'}`).join(', ') || 'none',
        open_maintenance: maintenance?.length || 0,
        maintenance_issues: maintenance?.map(m => `${m.drivers?.name}: ${m.issue}`).join(', ') || 'none',
        compliance_expiring: compliance?.length || 0,
        compliance_details: compliance?.map(c => `${c.drivers?.name}: ${c.record_type} expires ${c.expiry_date}`).join(', ') || 'none',
        date: today,
      }
    }

    case 'approve_ticket': {
      const { data, error } = await supabaseAdmin
        .from('tickets').update({ status: 'approved' }).eq('id', input.ticket_id).select().single()
      if (error) return { error: error.message }
      return { success: true, ticket: data }
    }

    case 'send_message': {
      if (input.driver_name) {
        const { data: drivers } = await supabaseAdmin.from('drivers').select('*')
        const driver = drivers?.find(d => d.name.toLowerCase().includes(input.driver_name.toLowerCase()))
        if (!driver) return { error: `Driver "${input.driver_name}" not found` }
        await supabaseAdmin.from('messages').insert({
          content: input.content, sender_id: 'admin', sender_role: 'admin',
          recipient_id: driver.id, is_read: false
        })
        return { success: true, sent_to: driver.name }
      } else {
        const { data: drivers } = await supabaseAdmin.from('drivers').select('*').eq('status', 'active')
        for (const d of (drivers || [])) {
          await supabaseAdmin.from('messages').insert({
            content: input.content, sender_id: 'admin', sender_role: 'admin',
            recipient_id: d.id, is_read: false
          })
        }
        return { success: true, sent_to: 'all active drivers', count: drivers?.length || 0 }
      }
    }

    case 'export_csv': {
      if (input.type === 'tickets') {
        let q = supabaseAdmin.from('tickets').select('*, drivers(name)').order('date', { ascending: false })
        if (input.start_date) q = q.gte('date', input.start_date)
        if (input.end_date) q = q.lte('date', input.end_date)
        const { data } = await q
        let rows = data || []
        if (input.driver_name) rows = rows.filter(t => t.drivers?.name?.toLowerCase().includes(input.driver_name.toLowerCase()))
        const csv = [
          'Date,Driver,Customer,Load ID,BOL,Location,Status,Boxes,Weight',
          ...rows.map(t => [
            t.date, t.drivers?.name, t.customer_name, t.load_id || '', t.bol_number || '',
            t.location_loaded || '', t.status,
            t.boxes?.length || 0,
            t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0).toFixed(1) || 0
          ].join(','))
        ].join('\n')
        return { csv, filename: `tickets_${input.start_date || 'all'}.csv`, rows: rows.length }
      }
      return { error: 'Unsupported export type' }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const { messages, role, driver_id } = await request.json()

    const system = role === 'admin'
      ? `You are an AI dispatch assistant for TruckSuperSoftware trucking company. You have access to live database tools. Use them to answer questions accurately. Today is ${new Date().toLocaleDateString()}.

Key behaviors:
- Always use tools to get real data before answering
- For fleet questions, use get_fleet_summary first
- For earnings, use get_earnings with the driver's name
- When asked to approve tickets, use approve_ticket
- When asked to message drivers, use send_message
- When asked for CSV/export, use export_csv and include the CSV in your response wrapped in \`\`\`csv blocks
- Be specific with numbers and names
- Format responses clearly with emojis for readability`
      : `You are an AI assistant for a truck driver at TruckSuperSoftware. You can only access this driver's own data (driver_id: ${driver_id}). Today is ${new Date().toLocaleDateString()}. Be helpful and concise.`

    // Agentic loop — keep calling tools until done
    if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
    let currentMessages = [...messages]
    let iterations = 0
    const maxIterations = 5

    while (iterations < maxIterations) {
      iterations++

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system,
          tools,
          messages: currentMessages,
        }),
      })

      const data = await response.json()

      if (!data.content) {
        return NextResponse.json({ reply: 'AI Error: ' + (data.error?.message || JSON.stringify(data)), messages: currentMessages })
      }

      // If stopped normally, return the text reply
      if (data.stop_reason === 'end_turn') {
        const reply = data.content.find(c => c.type === 'text')?.text || 'Done.'
        const finalMessages = [...currentMessages, { role: 'assistant', content: data.content }]
        return NextResponse.json({ reply, messages: finalMessages })
      }

      // If tool use, run the tools and continue
      if (data.stop_reason === 'tool_use') {
        const assistantMsg = { role: 'assistant', content: data.content }
        currentMessages = [...currentMessages, assistantMsg]

        const toolResults = []
        for (const block of data.content) {
          if (block.type === 'tool_use') {
            const result = await runTool(block.name, block.input)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
        }

        currentMessages = [...currentMessages, { role: 'user', content: toolResults }]
        continue
      }

      // Fallback
      const reply = data.content?.find(c => c.type === 'text')?.text || 'No response.'
      return NextResponse.json({ reply, messages: currentMessages })
    }

    return NextResponse.json({ reply: 'Request took too long. Please try a simpler question.', messages: currentMessages })

  } catch (err) {
    console.error('Assistant error:', err)
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}
