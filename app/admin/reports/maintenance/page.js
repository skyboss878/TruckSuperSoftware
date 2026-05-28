'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MaintenanceReport() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [filters, setFilters] = useState({ driver_id: '', status: '', severity: '' })

  useEffect(() => { loadDrivers() }, [])

  async function loadDrivers() {
    const data = await fetch('/api/drivers').then(r=>r.json())
    setDrivers(data || [])
  }

  function set(field, value) { setFilters(f => ({ ...f, [field]: value })) }

  async function runReport() {
    setLoading(true)
    let url = '/api/maintenance'
    const params = new URLSearchParams()
    if (filters.driver_id) query = query.eq('driver_id', filters.driver_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.severity) query = query.eq('severity', filters.severity)
    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Driver', 'Truck', 'Trailer', 'Issue', 'Severity', 'Status', 'Resolved At', 'Notes'],
      ...logs.map(l => [l.created_at?.split('T')[0], l.drivers?.name, l.truck_number, l.trailer_number, l.issue, l.severity, l.status, l.resolved_at?.split('T')[0] || '', l.notes])
    ]
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `maintenance_report.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Maintenance Report</h1>
        {logs.length > 0 && (
          <button onClick={exportCSV} className="text-[#2D7A5F] font-medium text-sm">CSV</button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700">Filters</h2>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
            <select value={filters.driver_id} onChange={e => set('driver_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
              <option value="">All drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</label>
              <select value={filters.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Severity</label>
              <select value={filters.severity} onChange={e => set('severity', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <button onClick={runReport} disabled={loading}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
            {loading ? 'Running...' : '🔍 Run Report'}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-gray-800">{log.issue}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    log.severity === 'high' ? 'bg-red-100 text-red-700' :
                    log.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{log.severity}</span>
                </div>
                <p className="text-sm text-gray-400">👤 {log.drivers?.name}</p>
                {log.truck_number && <p className="text-sm text-gray-400">🚛 Truck #{log.truck_number}</p>}
                <p className="text-sm text-gray-400 capitalize">Status: {log.status?.replace('_', ' ')}</p>
                <p className="text-xs text-gray-300 mt-1">{new Date(log.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔧</div>
            <p>Run a report to see maintenance logs</p>
          </div>
        )}
      </div>
    </div>
  )
}
