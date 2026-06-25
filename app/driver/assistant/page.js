'use client'
import { authFetch } from '@/lib/api-client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUGGESTIONS = [
  'How many miles did I drive this week?',
  'Show my recent tickets',
  'What is my compliance status?',
  'How much did I earn this month?',
]

export default function DriverAssistant() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [driverId, setDriverId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const info = await authFetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
      setDriverId(info?.id)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    const newMsg = { role: 'user', content: msg }
    const updatedHistory = [...history, newMsg]
    setMessages(m => [...m, { role: 'user', text: msg }])

    try {
      const res = await authFetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          role: 'driver',
          driver_id: driverId,
        }),
      })
      const data = await res.json()
      setHistory(data.messages || updatedHistory)
      setMessages(m => [...m, { role: 'assistant', text: data.reply || data.error }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-800">AI Assistant</h1>
          <p className="text-xs text-gray-400">Ask about your trips, miles & more</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.length === 0 && (
          <div className="space-y-4 mt-4">
            <div className="text-center">
              <div className="text-5xl mb-3">🤖</div>
              <p className="font-bold text-gray-800 text-lg">Your AI Assistant</p>
              <p className="text-gray-400 text-sm mt-1">Ask me anything about your work.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-6">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="bg-white rounded-2xl p-4 text-left text-sm text-gray-600 shadow-sm active:opacity-70 border border-gray-100">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white text-sm mr-2 shrink-0 mt-1">🤖</div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#2D7A5F] text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white text-sm mr-2 shrink-0">🤖</div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F] resize-none"
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="bg-[#2D7A5F] text-white w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 shrink-0 text-lg">
          ➤
        </button>
      </div>
    </div>
  )
}
