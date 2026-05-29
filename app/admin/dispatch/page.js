'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ACTIONS = [
  { key: 'full_auto', icon: '⚡', label: 'Full Auto Dispatch', desc: 'Review tickets, scan paperwork, generate briefing all at once', color: 'bg-[#2D7A5F]' },
  { key: 'morning_briefing', icon: '🌅', label: 'Morning Briefing', desc: 'AI ops summary: fleet status, alerts, priorities', color: 'bg-blue-500' },
  { key: 'auto_review', icon: '✅', label: 'Auto-Review Tickets', desc: 'AI approves clean tickets, flags missing paperwork', color: 'bg-emerald-500' },
  { key: 'paperwork_scan', icon: '🔍', label: 'Paperwork Scan', desc: 'Detect missing BOL, signatures, weights', color: 'bg-orange-500' },
  { key: 'broadcast', icon: '📢', label: 'Broadcast Message', desc: 'AI writes and sends message to all active drivers', color: 'bg-purple-500' },
]

export default function DispatchCenter() {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [broadcastTopic, setBroadcastTopic] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [error, setError] = useState('')

  async function runAction(key) {
    if (key === 'broadcast' && !broadcastTopic.trim()) { setShowBroadcast(true); return }
    setLoading(key); setResult(null); setError('')
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: key, topic: broadcastTopic }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({ key, data }); setShowBroadcast(false); setBroadcastTopic('')
    } catch (err) { setError(err.message) }
    setLoading(null)
  }

  function renderResult() {
    if (!result) return null
    const { key, data } = result

    if (key === 'morning_briefing') return (
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><span className="text-2xl">🌅</span><h3 className="font-bold text-gray-800">Morning Briefing</h3></div>
        <div className="grid grid-cols-3 gap-2">
          {[['👤','Active',data.stats?.active_drivers],['🚛','On Road',data.stats?.on_road],['📋','Pending',data.stats?.pending_review],['🎫',"Today's",data.stats?.todays_tickets],['🔧','Maint.',data.stats?.open_maintenance],['⚠️','Expiring',data.stats?.expiring_compliance]].map(([icon,label,val]) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
              <p className="text-lg">{icon}</p><p className="text-xl font-bold text-gray-800">{val ?? 0}</p><p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-3"><p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.summary}</p></div>
      </div>
    )

    if (key === 'auto_review') return (
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><span className="text-2xl">✅</span><h3 className="font-bold text-gray-800">Auto-Review Complete</h3></div>
        <div className="grid grid-cols-3 gap-2">
          {[['Reviewed',data.reviewed,'text-gray-800'],['Approved',data.approved,'text-emerald-600'],['Flagged',data.flagged,'text-red-500']].map(([label,val,color]) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center"><p className={`text-2xl font-bold ${color}`}>{val ?? 0}</p><p className="text-xs text-gray-400">{label}</p></div>
          ))}
        </div>
        {data.results?.map((r, i) => (
          <div key={i} className={`rounded-xl p-3 flex items-start gap-3 ${r.action === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <span className="text-lg mt-0.5">{r.action === 'approved' ? '✅' : '⚠️'}</span>
            <div><p className="text-sm font-semibold text-gray-800">{r.driver} — Load {r.load_id}</p>
              {r.issues?.length > 0 && <p className="text-xs text-red-600 mt-0.5">Missing: {r.issues.join(', ')}</p>}
              {r.action === 'approved' && <p className="text-xs text-emerald-600 mt-0.5">Approved & driver notified</p>}
            </div>
          </div>
        ))}
        {data.reviewed === 0 && <p className="text-center text-gray-400 text-sm py-2">No submitted tickets to review</p>}
      </div>
    )

    if (key === 'paperwork_scan') return (
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><span className="text-2xl">🔍</span><h3 className="font-bold text-gray-800">Paperwork Scan</h3></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-gray-800">{data.scanned ?? 0}</p><p className="text-xs text-gray-400">Scanned</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className={`text-2xl font-bold ${data.flagged_count > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{data.flagged_count ?? 0}</p><p className="text-xs text-gray-400">Issues</p></div>
        </div>
        {data.flagged?.length > 0 ? data.flagged.map((f, i) => (
          <div key={i} className="bg-red-50 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-800">{f.driver} — Load {f.load_id}</p>
            <p className="text-xs text-red-600 mt-0.5">Missing: {f.missing.join(', ')}</p>
          </div>
        )) : <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-emerald-700 font-semibold text-sm">✅ All paperwork complete</p></div>}
      </div>
    )

    if (key === 'broadcast') return (
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><span className="text-2xl">📢</span><h3 className="font-bold text-gray-800">Broadcast Sent</h3></div>
        <div className="bg-purple-50 rounded-xl p-3"><p className="text-sm text-gray-700 leading-relaxed">{data.message}</p></div>
        <p className="text-xs text-gray-400 text-center">Sent to {data.sent_to} drivers: {data.drivers?.join(', ')}</p>
      </div>
    )

    if (key === 'full_auto') return (
      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><span className="text-2xl">⚡</span><h3 className="font-bold text-gray-800">Full Auto Complete</h3></div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[['📋','Reviewed',data.review?.reviewed],['✅','Approved',data.review?.approved],['⚠️','Flagged',data.review?.flagged]].map(([icon,label,val]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-lg">{icon}</p><p className="text-xl font-bold text-gray-800">{val ?? 0}</p><p className="text-xs text-gray-400">{label}</p></div>
            ))}
          </div>
          {data.scan?.flagged_count > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 mb-3">
              <p className="text-sm font-semibold text-orange-700">🔍 {data.scan.flagged_count} paperwork issue{data.scan.flagged_count > 1 ? 's' : ''} found</p>
              {data.scan.flagged?.map((f, i) => <p key={i} className="text-xs text-orange-600 mt-1">{f.driver}: missing {f.missing.join(', ')}</p>)}
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">BRIEFING</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.briefing?.summary}</p>
          </div>
        </div>
      </div>
    )
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-800">Dispatch Center</h1>
          <p className="text-xs text-gray-400">AI-powered automation</p>
        </div>
        <div className="w-12" />
      </div>
      <div className="p-4 space-y-4 pb-8">
        <div className="space-y-3">
          {ACTIONS.map(action => (
            <button key={action.key} onClick={() => runAction(action.key)} disabled={!!loading}
              className={`w-full ${action.color} text-white rounded-2xl p-4 text-left shadow-sm active:opacity-80 disabled:opacity-50 flex items-center gap-4`}>
              <span className="text-3xl">{action.icon}</span>
              <div className="flex-1"><p className="font-bold text-base">{action.label}</p><p className="text-xs opacity-80 mt-0.5">{action.desc}</p></div>
              {loading === action.key && <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
            </button>
          ))}
        </div>
        {showBroadcast && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="font-semibold text-gray-800">📢 What should the broadcast be about?</p>
            <textarea value={broadcastTopic} onChange={e => setBroadcastTopic(e.target.value)}
              placeholder="e.g. Safety reminder, route change, holiday schedule..."
              rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D7A5F] resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowBroadcast(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => runAction('broadcast')} disabled={!broadcastTopic.trim() || !!loading}
                className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-40">
                {loading === 'broadcast' ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        )}
        {error && <div className="bg-red-50 rounded-2xl p-4"><p className="text-red-600 text-sm font-medium">⚠️ {error}</p></div>}
        {result && renderResult()}
      </div>
    </div>
  )
}
