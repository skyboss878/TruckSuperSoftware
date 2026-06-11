'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DriveTracker from '@/components/DriveTracker'
import Toast, { showToast } from '@/components/Toast'
import { useDriverSessionGuard } from '@/lib/useSessionGuard'
import TerrySpeedDial from '@/components/TerrySpeedDial'
import DriverStatsCard from '@/components/DriverStatsCard'
import { useLang } from '@/lib/LanguageContext'

export default function DriverDashboard() {
  const router = useRouter()
  useDriverSessionGuard()
  const [driver, setDriver] = useState(null)
  const [tickets, setTickets] = useState([])
  const [tab, setTab] = useState('started')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { lang, setLang, tr } = useLang()
  const [syncing, setSyncing] = useState(false)
  const [showTruckVerify, setShowTruckVerify] = useState(false)
  const [truckInput, setTruckInput] = useState('')
  const [truckSaving, setTruckSaving] = useState(false)

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
    // Check if today's pre-trip inspection is done
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/pre-trip?driver_id=${data.id}&date=${today}`)
    const pretrip = await res.json()
    if (!pretrip.completed) {
      router.replace('/driver/pretrip')
      return
    }

    setDriver(data)
    setLoading(false)

    // Verify truck number on every login
    if (!data.truck_number) {
      setShowTruckVerify(true)
    }

    // Heartbeat — mark driver online
    supabase.from('drivers').update({
      last_active_at: new Date().toISOString(),
      is_online: true,
    }).eq('id', data.id).then(() => {}).catch(() => {})
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

  async function saveTruck() {
    if (!truckInput.trim()) return
    setTruckSaving(true)
    await fetch(`/api/drivers/${driver.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ truck_number: truckInput.trim().toUpperCase() }),
    })
    setDriver(d => ({ ...d, truck_number: truckInput.trim().toUpperCase() }))
    setShowTruckVerify(false)
    setTruckSaving(false)
    showToast('Truck number saved')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <TerrySpeedDial />
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

      {/* GPS Drive Tracker */}
      <div className="px-4 pt-4">
        <DriverStatsCard driver={driver} />
        <DriveTracker driver={driver} onSessionComplete={() => loadTickets()} />
      </div>

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
      {/* Truck Verify Modal */}
      {showTruckVerify && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '28px 20px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚛</div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', margin: '0 0 6px' }}>Verify Your Truck</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Enter your truck number to continue</p>
            </div>
            <input
              value={truckInput}
              onChange={e => setTruckInput(e.target.value.toUpperCase())}
              placeholder="e.g. T-101"
              style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: '14px', padding: '14px 16px', fontSize: '18px', fontWeight: '700', textAlign: 'center', outline: 'none', letterSpacing: '2px', boxSizing: 'border-box', marginBottom: '12px' }}
              onFocus={e => e.target.style.borderColor = '#2D7A5F'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button onClick={saveTruck} disabled={truckSaving || !truckInput.trim()}
              style={{ width: '100%', padding: '15px', background: '#2D7A5F', border: 'none', borderRadius: '14px', color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', opacity: (truckSaving || !truckInput.trim()) ? 0.4 : 1 }}>
              {truckSaving ? 'Saving...' : 'Confirm Truck'}
            </button>
          </div>
        </div>
      )}

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
                { label: 'AI Assistant', icon: '🤖', path: '/driver/assistant' },
                { label: 'Trip Tracker', icon: '📍', path: '/driver/tracking' },
                { label: 'HOS Logger', icon: '⏱️', path: '/driver/hos' },
                { label: 'Fuel Log', icon: '⛽', path: '/driver/fuel' },
                { label: 'My Documents', icon: '🗄️', path: '/driver/documents' },
                { label: 'Expenses', icon: '💸', path: '/driver/expenses' },
                { label: 'Change Truck', icon: '🚛', action: 'truck' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => { setMenuOpen(false); if (item.action === 'truck') { setShowTruckVerify(true); setTruckInput(driver?.truck_number || ''); setMenuOpen(false) } else { router.push(item.path) } }}
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
