'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminMessages() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [adminId, setAdminId] = useState(null)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (!auth) { router.replace('/login'); return }
    loadAdminAndDrivers()
  }, [])

  useEffect(() => {
    if (!selectedDriver) return
    loadMessages(selectedDriver.id)

    // Cleanup previous channel
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    // Real-time for selected driver
    channelRef.current = supabase
      .channel(`admin-messages-${selectedDriver.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `driver_id=eq.${selectedDriver.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
        // Mark as read if it's from driver
        if (payload.new.sender_type === 'driver') {
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
          setUnreadCounts(prev => ({ ...prev, [selectedDriver.id]: 0 }))
        }
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [selectedDriver])

  useEffect(() => { scrollToBottom() }, [messages])

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function loadAdminAndDrivers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setAdminId(user.id)

    const driversRes = await fetch("/api/drivers")
    const driversData = await driversRes.json()
    const activeDrivers = Array.isArray(driversData) ? driversData.filter(d => d.status === "active") : []
    setDrivers(activeDrivers)

    // Get unread counts per driver
    const { data: unread } = await supabase
      .from('messages')
      .select('driver_id')
      .eq('sender_type', 'driver')
      .eq('read', false)

    const counts = {}
    unread?.forEach(m => {
      counts[m.driver_id] = (counts[m.driver_id] || 0) + 1
    })
    setUnreadCounts(counts)
  }

  async function loadMessages(driverId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Mark driver messages as read
    const unread = (data || []).filter(m => m.sender_type === 'driver' && !m.read)
    for (const m of unread) {
      await supabase.from('messages').update({ read: true }).eq('id', m.id)
    }
    setUnreadCounts(prev => ({ ...prev, [driverId]: 0 }))
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedDriver || !adminId) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: adminId,
      sender_type: 'admin',
      driver_id: selectedDriver.id,
      content: newMessage.trim(),
      read: false,
    })

    setNewMessage('')
    setSending(false)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  const QUICK_REPLIES = [
    'Please check your ticket',
    'Call me when available',
    'Approved ✓',
    'Need more info',
    'Good work today',
  ]

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Driver list sidebar */}
      <div className={`${selectedDriver ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-white border-r`}>
        <div className="px-4 py-4 border-b">
          <button onClick={() => router.back()} className="text-[#2D7A5F] text-sm font-medium mb-3 block">← Back</button>
          <h1 className="text-lg font-bold text-gray-800">Messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">Chat with your drivers</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {drivers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm">No active drivers</p>
            </div>
          ) : (
            drivers.map(driver => {
              const unread = unreadCounts[driver.id] || 0
              const isSelected = selectedDriver?.id === driver.id
              return (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition-colors ${
                    isSelected ? 'bg-[#E8F5F0]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold">
                      {driver.name?.[0]}
                    </div>
                    {unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{unread}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{driver.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {driver.truck_number ? `Truck #${driver.truck_number}` : driver.email}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat window */}
      {selectedDriver ? (
        <div className="flex flex-col flex-1 h-screen">
          {/* Chat header */}
          <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-[#2D7A5F] font-medium md:hidden"
            >
              ←
            </button>
            <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold">
              {selectedDriver.name?.[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{selectedDriver.name}</p>
              <p className="text-xs text-gray-400">
                {selectedDriver.truck_number ? `Truck #${selectedDriver.truck_number}` : selectedDriver.email}
              </p>
            </div>
            <button
              onClick={() => router.push(`/admin/drivers/${selectedDriver.id}`)}
              className="text-xs text-[#2D7A5F] font-medium border border-[#2D7A5F] px-3 py-1.5 rounded-xl"
            >
              Profile
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="text-5xl mb-4">💬</div>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm mt-1">Send {selectedDriver.name} a message</p>
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
                    const isMe = msg.sender_type === 'admin'
                    return (
                      <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold mr-2 flex-shrink-0 mt-1">
                            {selectedDriver.name?.[0]}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => setNewMessage(q)}
                className="flex-shrink-0 text-xs bg-[#E8F5F0] text-[#2D7A5F] px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t px-4 py-3 flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
              placeholder={`Message ${selectedDriver.name}...`}
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
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Select a driver to message</p>
          </div>
        </div>
      )}
    </div>
  )
}
