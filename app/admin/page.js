'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState('tickets')
  const [panicAlert, setPanicAlert] = useState(null)
  const [tickets, setTickets] = useState([])
  const [drivers, setDrivers] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketFilter, setTicketFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (!auth) { router.replace('/login'); return }
    loadAll()
    const params = new URLSearchParams(window.location.search)
    if (params.get("refresh")) router.replace("/admin")
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timesheets' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // Check for panic alerts on load
  useEffect(() => {
    const channel = supabase
      .channel('panic-watch')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'content=ilike.%PANIC ALERT%'
      }, (payload) => {
        setPanicAlert(payload.new)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [t, d, ts, m] = await Promise.all([
      fetch('/api/tickets').then(r => r.json()),
      fetch('/api/drivers').then(r => r.json()),
      fetch('/api/timesheets').then(r => r.json()),
      fetch('/api/maintenance').then(r => r.json()),
    ])
    setTickets(Array.isArray(t) ? t : [])
    setDrivers(Array.isArray(d) ? d : [])
    setTimesheets(Array.isArray(ts) ? ts : [])
    setMaintenance(Array.isArray(m) ? m : [])
    setLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem('admin_auth')
    router.replace('/login')
  }

  const filteredTickets = tickets
    .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
    .filter(t => !search || 
      t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.drivers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.load_id?.toLowerCase().includes(search.toLowerCase())
    )

  const stats = {
    total: tickets.length,
    submitted: tickets.filter(t => t.status === 'submitted').length,
    approved: tickets.filter(t => t.status === 'approved').length,
    activeDrivers: drivers.filter(d => d.status === 'active').length,
    openIssues: maintenance.filter(m => m.status === 'open').length,
  }

  const statusColor = {
    started: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2D7A5F] px-4 py-5">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-white text-xl font-bold">Smith's Freight Hub</h1>
            <p className="text-green-200 text-sm">Admin Dashboard</p>
          </div>
          
          <button onClick={handleLogout} className="text-green-200 text-sm font-medium">Logout</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Tickets', value: stats.total },
            { label: 'Pending', value: stats.submitted },
            { label: 'Approved', value: stats.approved },
            { label: 'Active Drivers', value: stats.activeDrivers },
            { label: 'Open Issues', value: stats.openIssues },
            { label: 'Timesheets', value: timesheets.length },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-green-200 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panic Alert Banner */}
      {panicAlert && (
        <div className="bg-red-600 px-4 py-3 flex items-center gap-3">
          <span className="text-white text-2xl animate-bounce">🚨</span>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">PANIC ALERT</p>
            <p className="text-red-200 text-xs">{panicAlert.content?.substring(0, 100)}</p>
          </div>
          <button onClick={() => setPanicAlert(null)} className="text-white text-xl">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b flex overflow-x-auto">
        {[
          { key: 'tickets', label: '🎫 Tickets' },
          { key: 'drivers', label: '👤 Drivers' },
          { key: 'timesheets', label: '🕐 Time' },
          { key: 'maintenance', label: '🔧 Maint.' },
          { key: 'reports', label: '📊 Reports' },
          { key: 'messages', label: '💬 Messages' },
          { key: 'assistant', label: '🤖 AI' },
          { key: 'tracking', label: '📍 Live Map' },
          { key: 'dispatch', label: '⚡ Dispatch' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-10">

        {/* TICKETS TAB */}
        {tab === 'tickets' && (
          <div className="space-y-3">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, driver, load ID..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#2D7A5F] bg-white"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['all', 'started', 'submitted', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setTicketFilter(f)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                    ticketFilter === f ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            {filteredTickets.map(ticket => (
              <div key={ticket.id}
                onClick={() => router.push(`/admin/ticket/${ticket.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm active:opacity-70">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-gray-800">{ticket.customer_name || '—'}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">👤 {ticket.drivers?.name || '—'}</p>
                  <p className="text-sm text-gray-400">📅 {new Date(ticket.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-400">📍 {ticket.location_loaded || '—'}</p>
                  {ticket.load_id && <p className="text-sm text-gray-400">🔖 Load #{ticket.load_id}</p>}
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p>No tickets found</p>
              </div>
            )}
          </div>
        )}

        {/* DRIVERS TAB */}
        {tab === 'drivers' && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/drivers/new')}
              className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold text-base">
              + Add New Driver
            </button>
            {drivers.map(driver => (
              <div key={driver.id}
                onClick={() => router.push(`/admin/drivers/${driver.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm active:opacity-70">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold">
                      {driver.name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{driver.name}</p>
                      <p className="text-sm text-gray-400">{driver.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {driver.status}
                  </span>
                </div>
                {(driver.truck_number || driver.phone) && (
                  <div className="mt-3 space-y-1">
                    {driver.truck_number && <p className="text-sm text-gray-400">🚛 Truck #{driver.truck_number} · Trailer #{driver.trailer_number}</p>}
                    {driver.phone && <p className="text-sm text-gray-400">📞 {driver.phone}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TIMESHEETS TAB */}
        {tab === 'timesheets' && (
          <div className="space-y-3">
            {timesheets.map(ts => {
              const miles = ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0
              return (
                <div key={ts.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{ts.drivers?.name}</p>
                      <p className="text-sm text-gray-400 capitalize">{ts.log_type?.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      ts.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ts.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-400">📅 {new Date(ts.date).toLocaleDateString()}</p>
                    {ts.location && <p className="text-sm text-gray-400">📍 {ts.location}</p>}
                    <p className="text-sm text-gray-400">🕐 {ts.start_time} → {ts.end_time || 'ongoing'}</p>
                    {miles > 0 && <p className="text-sm text-[#2D7A5F] font-medium">🛣️ {miles} total miles</p>}
                  </div>
                </div>
              )
            })}
            {timesheets.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🕐</div>
                <p>No timesheets yet</p>
              </div>
            )}
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {tab === 'maintenance' && (
          <div className="space-y-3">
            {maintenance.map(log => (
              <div key={log.id}
                onClick={() => router.push(`/admin/maintenance/${log.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm active:opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{log.issue}</p>
                    <p className="text-sm text-gray-400">{log.drivers?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    log.severity === 'high' ? 'bg-red-100 text-red-700' :
                    log.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {log.severity}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {log.truck_number && <p className="text-sm text-gray-400">🚛 Truck #{log.truck_number}</p>}
                  <p className="text-sm text-gray-400 capitalize">Status: {log.status.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-300">{new Date(log.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {maintenance.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🔧</div>
                <p>No maintenance issues</p>
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {[
              { label: 'Manage Customers & Locations', desc: 'Add, edit, activate or deactivate', icon: '⚙️', path: '/admin/manage' },
              { label: 'IFTA Fuel Tax', desc: 'Quarterly state miles and fuel tax report', icon: '⛽', path: '/admin/reports/ifta' },
              { label: 'Driver Earnings', desc: 'Weekly settlement sheet with CSV export', icon: '💰', path: '/admin/reports/earnings' },
              { label: 'AI Assistant', desc: 'Ask anything about your fleet in plain English', icon: '✨', path: '/admin/ai' },
              { label: 'Driver Settlements', desc: 'AI-generated pay settlements by driver', icon: '💰', path: '/admin/reports/settlements' },
              { label: 'Ticket Report', desc: 'Export tickets by date range, driver, customer', icon: '📋', path: '/admin/reports/tickets' },
              { label: 'Timesheet Report', desc: 'Hours and miles by driver', icon: '🕐', path: '/admin/reports/timesheets' },
              { label: 'Maintenance Report', desc: 'All issues by truck and status', icon: '🔧', path: '/admin/reports/maintenance' },
            ].map(r => (
              <button key={r.path} onClick={() => router.push(r.path)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:opacity-70">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#E8F5F0] rounded-2xl flex items-center justify-center text-2xl">
                    {r.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{r.label}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                  <span className="ml-auto text-gray-300">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {tab === 'messages' && (() => { setTimeout(() => router.push('/admin/messages'), 0); return null })()}
        {tab === 'assistant' && (() => { setTimeout(() => router.push('/admin/assistant'), 0); return null })()}
        {tab === 'tracking' && (() => { setTimeout(() => router.push('/admin/tracking'), 0); return null })()}
        {tab === 'dispatch' && (() => { setTimeout(() => router.push('/admin/dispatch'), 0); return null })()}
        {tab === 'settings' && (() => { setTimeout(() => router.push('/admin/settings'), 0); return null })()}
      </div>
    </div>
  )
}
