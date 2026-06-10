'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeTable } from '@/lib/useRealtimeTable'

const STYLES = {
  admin_login:           { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: '🔑' },
  admin_logout:          { bg: 'bg-gray-50',    text: 'text-gray-600',   icon: '🚪' },
  pin_changed:           { bg: 'bg-purple-50',  text: 'text-purple-700', icon: '🔐' },
  driver_password_reset: { bg: 'bg-orange-50',  text: 'text-orange-700', icon: '🔄' },
  driver_activated:      { bg: 'bg-green-50',   text: 'text-green-700',  icon: '✅' },
  driver_deactivated:    { bg: 'bg-red-50',     text: 'text-red-700',    icon: '⏸️' },
  ticket_approved:       { bg: 'bg-green-50',   text: 'text-green-700',  icon: '✅' },
  ticket_rejected:       { bg: 'bg-red-50',     text: 'text-red-700',    icon: '❌' },
  customer_added:        { bg: 'bg-teal-50',    text: 'text-teal-700',   icon: '👥' },
  customer_toggled:      { bg: 'bg-teal-50',    text: 'text-teal-700',   icon: '👥' },
  location_added:        { bg: 'bg-teal-50',    text: 'text-teal-700',   icon: '📍' },
  message_sent:          { bg: 'bg-blue-50',    text: 'text-blue-700',   icon: '💬' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AuditPage() {
  const router = useRouter()
  const [initial, setInitial] = useState([])
  const [filter, setFilter] = useState('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/audit')
      .then(r => r.json())
      .then(data => { setInitial(Array.isArray(data) ? data : []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const [logs] = useRealtimeTable('admin_audit_logs', initial)
  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)
  const actionTypes = [...new Set(logs.map(l => l.action))].sort()
  const todayCount = logs.filter(l => Date.now() - new Date(l.created_at) < 86400000).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Audit Log</h1>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>

      <div className="bg-white border-b px-4 py-3 grid grid-cols-3 gap-4">
        {[
          ['Total', logs.length],
          ['Today', todayCount],
          ['Admins', new Set(logs.map(l => l.admin_name)).size],
        ].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-lg font-bold text-gray-800">{val}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filter === 'all' ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'}`}>
          All ({logs.length})
        </button>
        {actionTypes.map(a => (
          <button key={a} onClick={() => setFilter(a)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filter === a ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {STYLES[a]?.icon || '•'} {a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-2 pb-10">
        {!loaded && <p className="text-center py-12 text-gray-400 animate-pulse">Loading...</p>}
        {loaded && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No audit logs yet</p>
            <p className="text-xs mt-1">Admin actions will appear here in real-time</p>
          </div>
        )}
        {filtered.map(log => {
          const s = STYLES[log.action] || { bg: 'bg-gray-50', text: 'text-gray-600', icon: '•' }
          return (
            <div key={log.id} className={`${s.bg} rounded-2xl p-4`}>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(log.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{log.admin_name || 'Unknown'}</p>
                  {log.target_id && <p className="text-xs text-gray-400 mt-0.5 truncate">Target: {log.target_id}</p>}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(log.metadata).map(([k, v]) => (
                        <span key={k} className="text-xs bg-white/60 px-2 py-0.5 rounded-full text-gray-600">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
