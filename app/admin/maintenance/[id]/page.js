'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminMaintenanceDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { loadLog() }, [])

  async function loadLog() {
    try {
      const res = await fetch(`/api/maintenance?id=${id}`)
      const data = await res.json()
      setLog(Array.isArray(data) ? data[0] : data?.id ? data : null)
    } catch (e) {
      console.error('loadLog error:', e)
    }
    setLoading(false)
  }

  async function updateStatus(status) {
    setUpdating(true)
    const update = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    await fetch('/api/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...update }),
    })
    await loadLog()
    setUpdating(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const severityColor = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }

  const statusIcon = { open: '🔴', in_progress: '🟡', resolved: '🟢' }

  if (!log) return <div className="p-8 text-center text-gray-400"><p>Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">Maintenance Issue</h1>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{statusIcon[log?.status]}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${severityColor[log.severity]}`}>
                {log?.severity} severity
              </span>
            </div>
            <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-4">{log?.issue}</h2>

          {[
            ['Driver', log.drivers?.name],
            ['Truck #', log.truck_number],
            ['Trailer #', log.trailer_number],
            ['Status', log.status?.replace('_', ' ')],
            ['Reported', new Date(log.created_at).toLocaleString()],
            ['Resolved', log.resolved_at ? new Date(log.resolved_at).toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-medium capitalize">{value || '—'}</span>
            </div>
          ))}

          {log.notes && (
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-medium mb-1">NOTES</p>
              <p className="text-gray-600 text-sm">{log?.notes}</p>
            </div>
          )}
        </div>

        {/* Status actions */}
        {log.status !== 'resolved' && (
          <div className="space-y-3">
            {log.status === 'open' && (
              <button onClick={() => updateStatus('in_progress')} disabled={updating}
                className="w-full bg-yellow-50 border-2 border-yellow-300 text-yellow-700 py-4 rounded-2xl font-semibold disabled:opacity-40">
                🟡 Mark In Progress
              </button>
            )}
            <button onClick={() => updateStatus('resolved')} disabled={updating}
              className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
              ✅ Mark Resolved
            </button>
          </div>
        )}

        {log.status === 'resolved' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold">✅ Issue Resolved</p>
            <p className="text-green-500 text-sm mt-1">{new Date(log.resolved_at).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
