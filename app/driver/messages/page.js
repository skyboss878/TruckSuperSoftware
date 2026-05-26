'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LanguageContext'

export default function DriverMessages() {
  const router = useRouter()
  const { tr } = useLang()
  const [driver, setDriver] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { loadDriver() }, [])

  useEffect(() => {
    if (!driver) return
    loadMessages()

    // Real-time subscription
    const channel = supabase
      .channel('driver-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `driver_id=eq.${driver.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [driver])

  useEffect(() => { scrollToBottom() }, [messages])

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase.from('drivers').select('*').eq('auth_id', user.id).single()
    if (!data) { router.replace('/login'); return }
    setDriver(data)
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Mark admin messages as read
    const unread = (data || []).filter(m => m.sender_type === 'admin' && !m.read)
    for (const m of unread) {
      await supabase.from('messages').update({ read: true }).eq('id', m.id)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !driver) return
    setSending(true)
    const payload = {
      sender_id: driver.auth_id,
      sender_type: 'driver',
      driver_id: driver.id,
      content: newMessage.trim(),
      read: false,
    }

    if (!navigator.onLine) {
      const offline = JSON.parse(localStorage.getItem('offline_messages') || '[]')
      offline.push(payload)
      localStorage.setItem('offline_messages', JSON.stringify(offline))
      setMessages(prev => [...prev, { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }])
      setNewMessage('')
      setSending(false)
      return
    }

    await supabase.from('messages').insert(payload)
    setNewMessage('')
    setSending(false)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Messages</h1>
          <p className="text-xs text-gray-400">Smith's Freight Hub</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400" title="Connected" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Your dispatcher will message you here</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {msgs.map(msg => {
                const isMe = msg.sender_type === 'driver'
                return (
                  <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                        A
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-[#2D7A5F] text-white rounded-br-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          <span className="text-xs text-gray-400">{msg.read ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="px-4 py-2 bg-white border-t flex gap-2 overflow-x-auto">
        {['On my way', 'Running late', 'Loaded up', 'At the yard'].map(quick => (
          <button key={quick} onClick={() => setNewMessage(quick)}
            className="flex-shrink-0 text-xs bg-[#E8F5F0] text-[#2D7A5F] px-3 py-1.5 rounded-full font-medium">
            {quick}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3 flex items-end gap-3">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#2D7A5F] resize-none max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
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
