import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const tools = [
  {
    name: 'get_tickets',
    description: 'Get tickets. Filter by driver_id, status (started/submitted/approved/rejected), or date range.',
    input_schema: {
      type: 'object',
      properties: {
        driver_id: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_drivers',
    description: 'Get all drivers or a specific driver by name or id.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
  {
    name: 'update_ticket',
    description: 'Update a ticket status (approved, rejected, submitted) or any field.',
    input_schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
  {
    name: 'get_compliance',
    description: 'Get DOT compliance records. Filter by driver_id.',
    input_schema: {
      type: 'object',
      properties: {
        driver_id: { type: 'string' },
      },
    },
  },
  {
    name: 'get_timesheets',
    description: 'Get timesheet records. Filter by driver_id.',
    input_schema: {
      type: 'object',
      properties: {
        driver_id: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_maintenance',
    description: 'Get maintenance records. Filter by driver_id or status.',
    input_schema: {
      type: 'object',
      properties: {
        driver_id: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
  {
    name: 'send_message',
    description: 'Send a message to a driver or broadcast to all drivers.',
    input_schema: {
      type: 'object',
      required: ['content', 'sender_id', 'sender_role'],
      properties: {
        content: { type: 'string' },
        sender_id: { type: 'string' },
        sender_role: { type: 'string' },
        recipient_id: { type: 'string' },
      },
    },
  },
]

async function runTool(name, input) {
  switch (name) {
    case 'get_tickets': {
      let q = supabaseAdmin.from('tickets').select('*, drivers(name)').order('created_at', { ascending: false }).limit(input.limit || 20)
      if (input.driver_id) q = q.eq('driver_id', input.driver_id)
      if (input.status)    q = q.eq('status', input.status)
      const { data } = await q
      return data || []
    }
    case 'get_drivers': {
      let q = supabaseAdmin.from('drivers').select('*').order('name')
      if (input.status) q = q.eq('status', input.status)
      const { data } = await q
      if (input.name) return (data||[]).filter(d => d.name.toLowerCase().includes(input.name.toLowerCase()))
      return data || []
    }
    case 'update_ticket': {
      const { id, ...updates } = input
      const { data } = await supabaseAdmin.from('tickets').update(updates).eq('id', id).select().single()
      return data || { success: true }
    }
    case 'get_compliance': {
      let q = supabaseAdmin.from('dot_compliance').select('*, drivers(name)').order('expiry_date', { ascending: true })
      if (input.driver_id) q = q.eq('driver_id', input.driver_id)
      const { data } = await q
      return data || []
    }
    case 'get_timesheets': {
      let q = supabaseAdmin.from('timesheets').select('*, drivers(name)').order('date', { ascending: false }).limit(input.limit || 20)
      if (input.driver_id) q = q.eq('driver_id', input.driver_id)
      const { data } = await q
      return data || []
    }
    case 'get_maintenance': {
      let q = supabaseAdmin.from('maintenance').select('*, drivers(name)').order('created_at', { ascending: false })
      if (input.driver_id) q = q.eq('driver_id', input.driver_id)
      if (input.status)    q = q.eq('status', input.status)
      const { data } = await q
      return data || []
    }
    case 'send_message': {
      const { data } = await supabaseAdmin.from('messages').insert(input).select().single()
      return data || { success: true }
    }
    default:
      return { error: 'Unknown tool' }
  }
}

export async function POST(request) {
  try {
    const { messages, role, user_id, driver_id } = await request.json()

    const system = role === 'admin'
      ? `You are the AI assistant for Smith's Freight Hub, a trucking company management app. You have full access to tickets, drivers, timesheets, compliance records, maintenance, and messages. You can read data and take actions like approving tickets or sending messages. Be concise and action-oriented. Today is ${new Date().toLocaleDateString()}.`
      : `You are the AI assistant for Smith's Freight Hub. You are helping a driver (driver_id: ${driver_id}). Only access data for this driver. Help them check their tickets, timesheets, miles, and compliance status. Be friendly and concise.`

    let response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system,
        tools,
        messages,
      }),
    })

    let data = await response.json()

    // Agentic loop — keep running tools until done
    while (data.stop_reason === 'tool_use') {
      const toolUses = data.content.filter(b => b.type === 'tool_use')
      const toolResults = await Promise.all(
        toolUses.map(async t => ({
          type: 'tool_result',
          tool_use_id: t.id,
          content: JSON.stringify(await runTool(t.name, t.input)),
        }))
      )

      messages.push({ role: 'assistant', content: data.content })
      messages.push({ role: 'user', content: toolResults })

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system,
          tools,
          messages,
        }),
      })
      data = await response.json()
    }

    const text = data.content?.find(b => b.type === 'text')?.text || 'Done.'
    return NextResponse.json({ reply: text, messages })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Assistant error' }, { status: 500 })
  }
}
