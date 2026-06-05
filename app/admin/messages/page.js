'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminMessages() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selected, setSelected] = useState(null) // null = broadcast
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [adminId, setAdminId] = useState(null)
  const [unread, setUnread] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminId(data?.user?.id || 'admin')
    })
    loadDrivers()
  }, [])

  useEffect(() => {
    loadMessages()
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selected])

  async function loadDrivers() {
    const res = await fetch('/api/drivers')
    const data = await res.json()
    setDrivers(data || [])
    // Load unread counts
    const counts = {}
    for (const d of (data || [])) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'driver')
        .eq('sender_id', d.id)
        .eq('is_read', false)
      counts[d.id] = count || 0
    }
    setUnread(counts)
  }

  async function loadMessages() {
    const url = selected
      ? `/api/messages?driver_id=${selected.id}`
      : `/api/messages`
    const res = await fetch(url)
    const data = await res.json()
    setMessages(data || [])
    // Mark driver messages as read
    const unreadIds = (data || [])
      .filter(m => m.sender_role === 'driver' && !m.is_read)
      .map(m => m.id)
    if (unreadIds.length > 0) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: unreadIds }),
      })
      setUnread(u => ({ ...u, [selected?.id]: 0 }))
    }
  }

  async function sendMessage() {
    if (!text.trim()) return
    setSending(true)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text.trim(),
        sender_id: 'admin',
        sender_role: 'admin',
        recipient_id: selected?.id || null,
      }),
    })
    setText('')
    setSending(false)
    await loadMessages()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Messages</h1>
        <div className="w-12" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-28 bg-white border-r flex flex-col shrink-0">
          <button
            onClick={() => setSelected(null)}
            className={`p-3 text-center border-b ${!selected ? 'bg-[#2D7A5F] text-white' : 'text-gray-600'}`}
          >
            <div className="text-lg">📢</div>
            <div className="text-xs font-medium mt-1">All</div>
          </button>
          {drivers.map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className={`p-3 text-center border-b relative ${selected?.id === d.id ? 'bg-[#2D7A5F] text-white' : 'text-gray-600'}`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold mx-auto">
                {d.name?.[0]}
              </div>
              <div className="text-xs mt-1 truncate">{d.name?.split(' ')[0]}</div>
              {unread[d.id] > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {unread[d.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-[#2D7A5F] text-white px-4 py-2 text-sm font-medium">
            {selected ? `${selected.name}` : '📢 Broadcast — All Drivers'}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-8">No messages yet</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  m.sender_role === 'admin'
                    ? 'bg-[#2D7A5F] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                }`}>
                  {m.recipient_id === null && m.sender_role === 'admin' && (
                    <div className="text-xs opacity-70 mb-1">📢 Broadcast</div>
                  )}
                  <p>{m.content}</p>
                  <p className={`text-xs mt-1 ${m.sender_role === 'admin' ? 'text-green-200' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {m.sender_role === 'admin' && (m.is_read ? ' ✓✓' : ' ✓')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="bg-white border-t p-3 flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={selected ? `Message ${selected.name}...` : 'Broadcast to all drivers...'}
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
      </div>
    </div>
  )
}
