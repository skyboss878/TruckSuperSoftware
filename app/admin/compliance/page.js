'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const RECORD_TYPES = [
  { key: 'cdl',               label: 'CDL License',        icon: '🪪' },
  { key: 'medical',           label: 'Medical Cert',        icon: '🏥' },
  { key: 'drug_test',         label: 'Drug Test',           icon: '🧪' },
  { key: 'annual_inspection', label: 'Annual Inspection',   icon: '🔍' },
  { key: 'mvr',               label: 'MVR Check',           icon: '📋' },
  { key: 'hazmat',            label: 'HazMat Cert',         icon: '☢️' },
]

const BLANK_FORM = {
  driver_id: '', record_type: 'cdl', status: 'valid',
  issue_date: '', expiry_date: '', result: '', notes: '',
}

export default function AdminCompliance() {
  const router = useRouter()
  const [tab, setTab]           = useState('overview')
  const [drivers, setDrivers]   = useState([])
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterDriver, setFilterDriver] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const [showAdd,      setShowAdd]      = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const [aiReport,     setAiReport]     = useState(null)
  const [form,         setForm]         = useState(BLANK_FORM)
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (!auth) { router.replace('/login'); return }
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [d, r] = await Promise.all([
      fetch('/api/drivers').then(res=>res.json()),
      fetch('/api/compliance').then(res=>res.json()),
    ])
    setDrivers(Array.isArray(d) ? d : [])
    setRecords(Array.isArray(r) ? r : [])
    setLoading(false)
  }

  function daysUntil(expiry_date) {
    if (!expiry_date) return null
    return Math.floor((new Date(expiry_date) - new Date()) / 86400000)
  }

  function expiryStyle(days, status) {
    if (status === 'failed')  return { badge: 'bg-red-100 text-red-700',      text: 'Failed' }
    if (status === 'pending') return { badge: 'bg-yellow-100 text-yellow-700', text: 'Pending' }
    if (days === null)        return { badge: 'bg-gray-100 text-gray-500',     text: 'No expiry' }
    if (days < 0)             return { badge: 'bg-red-100 text-red-700',       text: 'Expired' }
    if (days <= 30)           return { badge: 'bg-orange-100 text-orange-700', text: `${days}d left` }
    if (days <= 90)           return { badge: 'bg-yellow-100 text-yellow-700', text: `${days}d left` }
    return                           { badge: 'bg-green-100 text-green-700',   text: 'Valid' }
  }

  function isUrgent(r) {
    const d = daysUntil(r.expiry_date)
    return (d !== null && d < 0) || r.status === 'failed'
  }
  function isSoon(r) {
    const d = daysUntil(r.expiry_date)
    return d !== null && d >= 0 && d <= 30
  }

  const urgentCount = records.filter(isUrgent).length
  const soonCount   = records.filter(isSoon).length

  function driverSummary() {
    return drivers
      .filter(d => d.status === 'active')
      .map(driver => {
        const dRecs = records.filter(r => r.driver_id === driver.id)
        return {
          driver,
          records: dRecs,
          expired: dRecs.filter(isUrgent),
          expiringSoon: dRecs.filter(isSoon),
        }
      })
  }

  async function addRecord() {
    if (!form.driver_id) return
    setSaving(true)
    const payload = { ...form }
    if (!payload.issue_date)  delete payload.issue_date
    if (!payload.expiry_date) delete payload.expiry_date
    if (!payload.result)      delete payload.result
    if (!payload.notes)       delete payload.notes
    await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setShowAdd(false)
    setForm(BLANK_FORM)
    setSaving(false)
    loadAll()
  }

  async function generateAiReport() {
    setGenerating(true)
    setAiReport(null)
    const summary = driverSummary()

    const driverLines = summary.map(s =>
      `${s.driver.name}: ${s.records.length} records, ${s.expired.length} expired/failed, ${s.expiringSoon.length} expiring within 30 days`
    ).join('\n')

    const recordLines = records.map(r => {
      const days = daysUntil(r.expiry_date)
      const label = RECORD_TYPES.find(t => t.key === r.record_type)?.label || r.record_type
      return `- ${r.drivers?.name}: ${label}, status: ${r.status}` +
        (r.expiry_date ? `, expires: ${r.expiry_date} (${days} days)` : '') +
        (r.result ? `, result: ${r.result}` : '')
    }).join('\n')

    const prompt =
`You are a DOT compliance officer for Smith's Freight Hub, a trucking company. Generate a professional DOT compliance status report.

FLEET OVERVIEW:
- Active drivers: ${summary.length}
- Total compliance records: ${records.length}
- Expired or failed: ${urgentCount}
- Expiring within 30 days: ${soonCount}

DRIVER SUMMARY:
${driverLines || 'None'}

ALL RECORDS:
${recordLines || 'None'}

Write a professional DOT compliance report with:
1. Executive summary of overall compliance status
2. Urgent items requiring immediate attention (expired/failed)
3. Items expiring within 30 days
4. Driver-by-driver notes for any flagged drivers
5. Recommendations

Professional tone, under 500 words, clear headings.`

    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      setAiReport(data.content?.find(c => c.type === 'text')?.text || 'No response received.')
    } catch {
      setAiReport('Failed to generate report. Please check your connection and try again.')
    }
    setGenerating(false)
  }

  const filteredRecords = records
    .filter(r => filterDriver === 'all' || r.driver_id === filterDriver)
    .filter(r => filterType   === 'all' || r.record_type === filterType)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">DOT Compliance</h1>
        <button onClick={() => setShowAdd(true)} className="text-[#2D7A5F] font-medium text-sm">+ Add</button>
      </div>

      {(urgentCount > 0 || soonCount > 0) && (
        <div className={`px-4 py-3 flex items-center gap-2 ${urgentCount > 0 ? 'bg-red-50' : 'bg-orange-50'}`}>
          <span>{urgentCount > 0 ? '🚨' : '⚠️'}</span>
          <p className="text-sm font-medium text-gray-700">
            {urgentCount > 0 && `${urgentCount} expired/failed · `}
            {soonCount > 0 && `${soonCount} expiring within 30 days`}
          </p>
        </div>
      )}

      <div className="bg-white border-b flex">
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'records',  label: '📋 Records'  },
          { key: 'report',   label: '✨ AI Report' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-10 space-y-3">

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Records', value: records.length,  bg: 'bg-white'      },
                { label: 'Expired',       value: urgentCount,      bg: urgentCount > 0 ? 'bg-red-50'    : 'bg-white' },
                { label: 'Expiring Soon', value: soonCount,        bg: soonCount   > 0 ? 'bg-orange-50' : 'bg-white' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center shadow-sm`}>
                  <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {driverSummary().map(({ driver, records: dRecs, expired, expiringSoon }) => (
              <div key={driver.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold text-sm">
                      {driver.name?.[0]}
                    </div>
                    <p className="font-bold text-gray-800">{driver.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {expired.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{expired.length} expired</span>
                    )}
                    {expiringSoon.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">{expiringSoon.length} soon</span>
                    )}
                    {expired.length === 0 && expiringSoon.length === 0 && dRecs.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">✓ OK</span>
                    )}
                  </div>
                </div>
                {dRecs.length === 0 ? (
                  <p className="text-sm text-gray-400">No records on file</p>
                ) : (
                  <div className="space-y-1.5">
                    {dRecs.map(r => {
                      const { badge, text } = expiryStyle(daysUntil(r.expiry_date), r.status)
                      const type = RECORD_TYPES.find(t => t.key === r.record_type)
                      return (
                        <div key={r.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{type?.icon} {type?.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge}`}>{text}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'records' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D7A5F] bg-white">
                <option value="all">All Drivers</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D7A5F] bg-white">
                <option value="all">All Types</option>
                {RECORD_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
              </select>
            </div>

            {filteredRecords.map(r => {
              const { badge, text } = expiryStyle(daysUntil(r.expiry_date), r.status)
              const type = RECORD_TYPES.find(t => t.key === r.record_type)
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{type?.icon} {type?.label}</p>
                      <p className="text-sm text-gray-400">{r.drivers?.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${badge}`}>{text}</span>
                  </div>
                  <div className="space-y-1">
                    {r.issue_date  && <p className="text-sm text-gray-400">📅 Issued: {new Date(r.issue_date).toLocaleDateString()}</p>}
                    {r.expiry_date && <p className="text-sm text-gray-400">⏰ Expires: {new Date(r.expiry_date).toLocaleDateString()}</p>}
                    {r.result      && <p className="text-sm text-gray-400">🧪 Result: {r.result}</p>}
                    {r.notes       && <p className="text-sm text-gray-400">📝 {r.notes}</p>}
                  </div>
                </div>
              )
            })}

            {filteredRecords.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p>No records found</p>
              </div>
            )}
          </>
        )}

        {tab === 'report' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-4">
                Generate an AI-powered DOT compliance analysis for your entire fleet.
              </p>
              <button onClick={generateAiReport} disabled={generating}
                className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing fleet...
                  </>
                ) : '✨ Generate Compliance Report'}
              </button>
            </div>

            {aiReport && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span>✨</span>
                  <h3 className="font-bold text-gray-700">AI Compliance Report</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{aiReport}</p>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="bg-black/30 absolute inset-0" onClick={() => setShowAdd(false)} />
          <div className="bg-white rounded-t-3xl w-full p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-800 text-lg">Add Compliance Record</h2>

            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
              <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
                <option value="">Select driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Record Type</label>
              <select value={form.record_type} onChange={e => setForm({ ...form, record_type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
                {RECORD_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
                <option value="valid">Valid</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {form.record_type === 'drug_test' && (
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Test Result</label>
                <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
                  <option value="">Select result...</option>
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowAdd(false); setForm(BLANK_FORM) }}
                className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">
                Cancel
              </button>
              <button onClick={addRecord} disabled={!form.driver_id || saving}
                className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
