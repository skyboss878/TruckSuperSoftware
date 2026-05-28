'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SEVERITY = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
]

export default function MaintenancePage() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('open')
  const [form, setForm] = useState({
    issue: '',
    severity: 'low',
    notes: '',
  })

  useEffect(() => { loadDriver() }, [])
  useEffect(() => { if (driver) loadLogs() }, [driver, tab])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    const data = await fetch(`/api/drivers?auth_id=${user.id}`).then(r=>r.json())
    setDriver(data)
  }

  async function loadLogs() {
    const { data } = await supabase
      .from('maintenance')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setLogs(data || [])
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.issue) return
    setSaving(true)
    const payload = {
      driver_id: driver.id,
      truck_number: driver.truck_number,
      trailer_number: driver.trailer_number,
      issue: form.issue,
      severity: form.severity,
      notes: form.notes,
      status: 'open',
      synced: true,
    }

    if (!navigator.onLine) {
      const offline = JSON.parse(localStorage.getItem('offline_maintenance') || '[]')
      offline.push({ ...payload, synced: false, id: crypto.randomUUID() })
      localStorage.setItem('offline_maintenance', JSON.stringify(offline))
      setShowForm(false)
      setSaving(false)
      return
    }

    await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, auth_id: driver.auth_id }),
    })
    setForm({ issue: '', severity: 'low', notes: '' })
    setShowForm(false)
    setSaving(false)
    loadLogs()
  }

  const severityInfo = (val) => SEVERITY.find(s => s.value === val) || SEVERITY[0]
  const statusIcon = { open: '🔴', in_progress: '🟡', resolved: '🟢' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Maintenance</h1>
        <div className="w-12" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b flex">
        {['open', 'in_progress', 'resolved'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold capitalize border-b-2 transition-colors ${
              tab === t ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 pb-24 space-y-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🔧</div>
            <p className="text-lg font-medium">No issues reported</p>
            <p className="text-sm mt-1">Tap + to report a maintenance issue</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span>{statusIcon[log.status]}</span>
                  <p className="font-bold text-gray-800">{log.issue}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${severityInfo(log.severity).color}`}>
                  {severityInfo(log.severity).label}
                </span>
              </div>
              <div className="space-y-1 mt-2">
                {log.truck_number && (
                  <p className="text-sm text-gray-400">🚛 Truck #{log.truck_number}</p>
                )}
                {log.trailer_number && (
                  <p className="text-sm text-gray-400">🔗 Trailer #{log.trailer_number}</p>
                )}
                {log.notes && (
                  <p className="text-sm text-gray-500 mt-2 italic">{log.notes}</p>
                )}
                <p className="text-xs text-gray-300 mt-1">
                  {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              {log.resolved_at && (
                <p className="text-xs text-green-500 mt-2 font-medium">
                  ✅ Resolved {new Date(log.resolved_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2D7A5F] rounded-full shadow-lg flex items-center justify-center text-white text-2xl active:opacity-80"
      >
        +
      </button>

      {/* Report Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="border-b px-4 py-4 flex items-center justify-between">
            <button onClick={() => setShowForm(false)} className="text-gray-400">✕</button>
            <h2 className="font-bold text-gray-800">Report Issue</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            {/* Truck info banner */}
            {driver?.truck_number && (
              <div className="bg-[#E8F5F0] rounded-xl p-3 flex items-center gap-2">
                <span>🚛</span>
                <span className="text-sm text-[#2D7A5F] font-medium">
                  Truck #{driver.truck_number} · Trailer #{driver.trailer_number}
                </span>
              </div>
            )}

            {/* Issue */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Issue Description</label>
              <textarea
                value={form.issue}
                onChange={e => set('issue', e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] resize-none text-base"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2 block">Severity</label>
              <div className="flex gap-2">
                {SEVERITY.map(s => (
                  <button key={s.value} onClick={() => set('severity', s.value)}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
                      form.severity === s.value
                        ? s.value === 'low' ? 'border-green-500 bg-green-50 text-green-700'
                          : s.value === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-400'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Additional Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any extra details..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] resize-none"
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <button onClick={handleSave} disabled={saving || !form.issue}
              className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40 text-lg">
              {saving ? 'Submitting...' : 'Report Issue'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
