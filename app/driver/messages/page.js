'use client'
import { authFetch } from '@/lib/api-client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast, { showToast } from '@/components/Toast'
import TerrySpeedDial from '@/components/TerrySpeedDial'

export default function DriverMessages() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [driverId, setDriverId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setDriverId(data.user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (driverId) loadMessages()
  }, [driverId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('driver-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [driverId])

  async function loadMessages() {
    const res = await authFetch(`/api/messages?user_id=${driverId}`)
    const data = await res.json()
    setMessages(data || [])
    // Mark admin messages as read
    const unreadIds = (data || [])
      .filter(m => m.sender_role === 'admin' && !m.is_read)
      .map(m => m.id)
    if (unreadIds.length > 0) {
      await authFetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: unreadIds }),
      })
    }
  }

  async function sendMessage() {
    if (!text.trim() || !driverId) return
    setSending(true)
    await authFetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text.trim(),
        sender_id: driverId,
        sender_role: 'driver',
        recipient_id: null,
      }),
    })
    setText('')
    setSending(false)
    loadMessages()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Messages</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-16">No messages yet</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_role === 'driver' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
              m.sender_role === 'driver'
                ? 'bg-[#2D7A5F] text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
            }`}>
              {m.recipient_id === null && m.sender_role === 'admin' && (
                <div className="text-xs opacity-70 mb-1">📢 Broadcast</div>
              )}
              <p>{m.content}</p>
              <p className={`text-xs mt-1 ${m.sender_role === 'driver' ? 'text-green-200' : 'text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Message dispatch..."
          rows={1}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F] resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          className="bg-[#2D7A5F] text-white w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
