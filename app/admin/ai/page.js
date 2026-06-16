'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AIAssistant() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your freight assistant. Ask me anything about your drivers, tickets, miles, settlements, or compliance. Try: \"How many tickets were submitted this week?\" or \"Which drivers have expired compliance records?\"" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (!auth) { router.replace('/login'); return }
    loadContext()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadContext() {
    const [
      { data: drivers },
      { data: tickets },
      { data: timesheets },
      { data: maintenance },
      { data: compliance },
    ] = await Promise.all([
      supabase.from('drivers').select('*'),
      supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('timesheets').select('*').order('date', { ascending: false }).limit(100),
      supabase.from('maintenance').select('*').order('created_at', { ascending: false }),
      supabase.from('dot_compliance').select('*, drivers(name)'),
    ])

    setContext({ drivers, tickets, timesheets, maintenance, compliance })
  }

  async function sendMessage() {
    if (!input.trim() || loading || !context) return

    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const systemPrompt = `You are an AI assistant for TWS Fleet Command, a trucking company management system. You have access to real-time data from the database. Answer questions clearly and concisely. When showing numbers, be specific. Format data in a readable way.

CURRENT DATABASE DATA:

DRIVERS (${context.drivers?.length || 0} total):
${context.drivers?.map(d => `- ${d.name} | ${d.email} | Truck: ${d.truck_number || 'N/A'} | Status: ${d.status} | Trailer: ${d.trailer_number || 'N/A'}`).join('\n') || 'None'}

TICKETS (last 100):
${context.tickets?.map(t => `- ID: ${t.load_id || 'N/A'} | Customer: ${t.customer_name || 'N/A'} | Driver: ${t.driver_id} | Date: ${t.date} | Status: ${t.status} | Location: ${t.location_loaded || 'N/A'}`).join('\n') || 'None'}

TIMESHEETS (last 100):
${context.timesheets?.map(ts => `- Driver: ${ts.driver_id} | Date: ${ts.date} | Type: ${ts.log_type} | Miles: ${ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0} | Status: ${ts.status}`).join('\n') || 'None'}

MAINTENANCE ISSUES:
${context.maintenance?.map(m => `- Issue: ${m.issue} | Severity: ${m.severity} | Status: ${m.status} | Driver: ${m.driver_id}`).join('\n') || 'None'}

DOT COMPLIANCE:
${context.compliance?.map(c => `- Driver: ${c.drivers?.name} | Type: ${c.record_type} | Status: ${c.status} | Expires: ${c.expiry_date || 'N/A'}`).join('\n') || 'None'}

Today's date: ${new Date().toLocaleDateString()}

Answer the user's question based on this data. Be helpful, specific, and concise. If asked to calculate pay/settlements, use the data available. If asked about something not in the data, say so clearly.`

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: input.trim() }
          ]
        })
      })

      const data = await response.json()
      const aiText = data.content?.find(c => c.type === 'text')?.text || 'Sorry, I could not generate a response.'

      setMessages(prev => [...prev, { role: 'assistant', content: aiText }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }

    setLoading(false)
    // Refresh context after each message
    loadContext()
  }

  const SUGGESTIONS = [
    'How many tickets this week?',
    'Which drivers have open maintenance issues?',
    'Show me expired compliance records',
    'Who drove the most miles this month?',
    'How many approved tickets does each driver have?',
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">AI Assistant</h1>
          <p className="text-xs text-gray-400">Ask anything about your fleet</p>
        </div>
        <div className="w-8 h-8 bg-[#2D7A5F] rounded-full flex items-center justify-center text-white text-sm">✨</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-[#2D7A5F] rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">✨</div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-[#2D7A5F] text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-[#2D7A5F] rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0">✨</div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium text-center">Try asking:</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setInput(s)}
                className="w-full text-left bg-white rounded-xl px-4 py-3 text-sm text-gray-600 shadow-sm border border-gray-100 active:opacity-70">
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex items-end gap-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
          placeholder="Ask about your fleet..."
          rows={1}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#2D7A5F] resize-none max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim() || !context}
          className="w-10 h-10 bg-[#2D7A5F] rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
