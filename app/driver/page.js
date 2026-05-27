'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LanguageContext'

export default function DriverDashboard() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [tickets, setTickets] = useState([])
  const [tab, setTab] = useState('started')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { lang, setLang, tr } = useLang()
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadDriver()
  }, [])

  useEffect(() => {
    if (driver) {
      loadTickets()
      syncOfflineData()
    }
  }, [driver])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('auth_id', user.id)
      .single()
    if (!data) { router.replace('/login'); return }
    if (data.status === 'inactive') {
      await supabase.auth.signOut()
      router.replace('/login')
      return
    }
    setDriver(data)
    setLoading(false)
  }

  async function loadTickets() {
    const res = await fetch(`/api/tickets?driver_id=${driver.id}`)
    const data = await res.json()
    setTickets(Array.isArray(data) ? data : [])
  }

  async function syncOfflineData() {
    const offline = JSON.parse(localStorage.getItem('offline_tickets') || '[]')
    if (offline.length === 0) return
    setSyncing(true)
    for (const ticket of offline) {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticket, auth_id: driver.auth_id, synced: true }),
      })
    }
    localStorage.removeItem('offline_tickets')
    await loadTickets()
    setSyncing(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const filtered = tickets.filter(t =>
    tab === 'started' ? t.status === 'started' :
    tab === 'submitted' ? t.status === 'submitted' :
    t.status === 'approved'
  )

  const grouped = filtered.reduce((acc, ticket) => {
    const date = new Date(ticket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(ticket)
    return acc
  }, {})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-600">{driver?.name?.[0]}</span>
        </button>
        <h1 className="text-lg font-bold text-gray-800">Tickets</h1>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        {['started', 'submitted', 'approved'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
              tab === t ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Syncing banner */}
      {syncing && (
        <div className="bg-[#E8F5F0] px-4 py-2 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#2D7A5F] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#2D7A5F] font-medium">Syncing Data</span>
        </div>
      )}

      {/* Ticket List */}
      <div className="p-4 space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium">No data found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs text-gray-400 font-medium mb-2">{date}</p>
              {items.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/driver/ticket/${ticket.id}`)}
                  className="bg-white rounded-2xl p-4 mb-2 shadow-sm active:opacity-70"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-800">{ticket.customer_name || 'Unknown Customer'}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{ticket.load_id}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                    <span>📅</span>
                    <span>{new Date(ticket.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                    <span>📍</span>
                    <span>{ticket.location_loaded || 'No location'}</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/driver/ticket/new')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2D7A5F] rounded-full shadow-lg flex items-center justify-center text-white text-2xl active:opacity-80"
      >
        +
      </button>

      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="bg-white w-72 h-full shadow-xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold text-lg">
                {driver?.name?.[0]}
              </div>
              <div>
                <p className="font-bold text-gray-800">{driver?.name}</p>
                <p className="text-sm text-gray-400">{driver?.email}</p>
              </div>
            </div>
            <nav className="space-y-1 flex-1">
              {[
                { label: 'Tickets', icon: '🎫', path: '/driver' },
                { label: 'Time Sheet', icon: '🕐', path: '/driver/timesheet' },
                { label: 'Maintenance', icon: '🔧', path: '/driver/maintenance' },
                { label: 'Messages', icon: '💬', path: '/driver/messages' },
                { label: 'Compliance', icon: '📋', path: '/driver/compliance' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => { setMenuOpen(false); router.push(item.path) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-gray-400 font-medium"
            >
              <span>→</span>
              <span>Logout</span>
            </button>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  )
}
// Language sync is handled in loadDriver via LanguageContext
