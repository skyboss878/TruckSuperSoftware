'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUGGESTIONS = [
  'Show me all submitted tickets',
  'Who has expired compliance records?',
  'Approve all submitted tickets',
  'How many active drivers do we have?',
  'Send a message to all drivers',
  'Show open maintenance issues',
]

export default function AdminAssistant() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id))
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
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          role: 'admin',
          user_id: userId,
        }),
      })
      const data = await res.json()
      setHistory(data.messages || updatedHistory)
      const reply = data.reply || data.error || 'No response'
      // Check if response contains CSV
      const csvMatch = reply.match(/```csv\n([\s\S]*?)```/)
      if (csvMatch) {
        const csv = csvMatch[1]
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'smiths_export.csv'
        a.click()
      }
      setMessages(m => [...m, { role: 'assistant', text: reply.replace(/```csv[\s\S]*?```/g, '[CSV file downloaded ✅]') }])
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
          <p className="text-xs text-gray-400">Ask anything about your fleet</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.length === 0 && (
          <div className="space-y-4 mt-4">
            <div className="text-center">
              <div className="text-5xl mb-3">🤖</div>
              <p className="font-bold text-gray-800 text-lg">Smith's AI Assistant</p>
              <p className="text-gray-400 text-sm mt-1">I can read your data, approve tickets, send messages, and more.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-6">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="bg-white rounded-2xl p-3 text-left text-sm text-gray-600 shadow-sm active:opacity-70 border border-gray-100">
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
