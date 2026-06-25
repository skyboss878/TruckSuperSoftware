'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/api-client'

export default function SettlementsReport() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ratePerMile, setRatePerMile] = useState('')
  const [ratePerLoad, setRatePerLoad] = useState('')
  const [settlement, setSettlement] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadDrivers() }, [])

  async function loadDrivers() {
    const res = await fetch("/api/drivers")
    const data = await res.json()
    setDrivers(Array.isArray(data) ? data : [])
  }
  async function generateSettlement() {
    if (!selectedDriver || !startDate || !endDate) {
      setError('Please select a driver and date range')
      return
    }
    setGenerating(true)
    setError('')
    setSettlement(null)

    // Fetch driver data
    const driver = drivers.find(d => d.id === selectedDriver)

    const [tickets, timesheets] = await Promise.all([
      authFetch(`/api/tickets?driver_id=${selectedDriver}&start=${startDate}&end=${endDate}&status=approved`).then(r=>r.json()),
      authFetch(`/api/timesheets?driver_id=${selectedDriver}&start=${startDate}&end=${endDate}`).then(r=>r.json()),
    ])

    const totalLoads = tickets?.length || 0
    const totalMiles = timesheets?.reduce((sum, ts) =>
      sum + (ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0), 0) || 0
    const totalBoxes = tickets?.reduce((sum, t) => sum + (t.boxes?.length || 0), 0) || 0
    const totalWeight = tickets?.reduce((sum, t) =>
      sum + (t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0) || 0), 0) || 0

    const workingHours = timesheets
      ?.filter(ts => ts.log_type === 'working' && ts.start_time && ts.end_time)
      .reduce((sum, ts) => {
        const [sh, sm] = ts.start_time.split(':').map(Number)
        const [eh, em] = ts.end_time.split(':').map(Number)
        const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
        return sum + Math.max(0, hours)
      }, 0) || 0

    const milePay = ratePerMile ? totalMiles * parseFloat(ratePerMile) : 0
    const loadPay = ratePerLoad ? totalLoads * parseFloat(ratePerLoad) : 0
    const totalPay = milePay + loadPay

    // State miles breakdown
    const stateMilesMap = {}
    timesheets?.forEach(ts => {
      ts.state_miles?.forEach(sm => {
        if (sm.state && sm.miles) {
          stateMilesMap[sm.state] = (stateMilesMap[sm.state] || 0) + (parseInt(sm.miles) || 0)
        }
      })
    })

    // Build AI prompt
    const prompt = `You are a trucking payroll specialist. Generate a professional driver settlement summary based on this data:

Driver: ${driver.name}
Period: ${startDate} to ${endDate}
Truck #: ${driver.truck_number || 'N/A'}
Trailer #: ${driver.trailer_number || 'N/A'}

PERFORMANCE DATA:
- Total approved loads: ${totalLoads}
- Total miles driven: ${totalMiles}
- Total boxes handled: ${totalBoxes}
- Total weight: ${totalWeight} tons
- Working hours: ${workingHours.toFixed(1)} hours

PAY CALCULATION:
- Rate per mile: $${ratePerMile || '0'}
- Rate per load: $${ratePerLoad || '0'}
- Mile pay: $${milePay.toFixed(2)}
- Load pay: $${loadPay.toFixed(2)}
- Total settlement: $${totalPay.toFixed(2)}

STATE MILES BREAKDOWN:
${Object.entries(stateMilesMap).map(([state, miles]) => `- ${state}: ${miles} miles`).join('\n') || '- No state miles recorded'}

TICKETS:
${tickets?.slice(0, 10).map(t => `- ${t.date}: ${t.customer_name}, Load #${t.load_id || 'N/A'}, ${t.location_loaded || 'N/A'}`).join('\n') || '- No approved tickets'}

Write a clean, professional settlement summary. Include:
1. A brief performance overview paragraph
2. Key metrics summary
3. Pay breakdown
4. Any observations about performance or patterns
4. A closing note

Keep it professional, clear, and under 400 words.`

    try {
      const response = await authFetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const aiText = data.content?.find(c => c.type === 'text')?.text || ''

      setSettlement({
        driver,
        period: { start: startDate, end: endDate },
        metrics: {
          totalLoads,
          totalMiles,
          totalBoxes,
          totalWeight,
          workingHours: workingHours.toFixed(1),
          milePay,
          loadPay,
          totalPay,
        },
        stateMiles: stateMilesMap,
        tickets: tickets || [],
        aiSummary: aiText,
      })
    } catch (err) {
      setError('Failed to generate AI summary. Showing raw data.')
      setSettlement({
        driver,
        period: { start: startDate, end: endDate },
        metrics: { totalLoads, totalMiles, totalBoxes, totalWeight, workingHours: workingHours.toFixed(1), milePay, loadPay, totalPay },
        stateMiles: stateMilesMap,
        tickets: tickets || [],
        aiSummary: null,
      })
    }
    setGenerating(false)
  }

  function exportCSV() {
    if (!settlement) return
    const { driver, period, metrics, stateMiles, tickets } = settlement
    const rows = [
      ['SMITH\'S FREIGHT HUB - DRIVER SETTLEMENT'],
      [''],
      ['Driver', driver.name],
      ['Period', `${period.start} to ${period.end}`],
      ['Truck #', driver.truck_number || 'N/A'],
      ['Trailer #', driver.trailer_number || 'N/A'],
      [''],
      ['METRICS'],
      ['Total Loads', metrics.totalLoads],
      ['Total Miles', metrics.totalMiles],
      ['Total Boxes', metrics.totalBoxes],
      ['Total Weight (tons)', metrics.totalWeight],
      ['Working Hours', metrics.workingHours],
      [''],
      ['PAY'],
      ['Mile Pay', `$${metrics.milePay.toFixed(2)}`],
      ['Load Pay', `$${metrics.loadPay.toFixed(2)}`],
      ['TOTAL SETTLEMENT', `$${metrics.totalPay.toFixed(2)}`],
      [''],
      ['STATE MILES'],
      ...Object.entries(stateMiles).map(([state, miles]) => [state, miles]),
      [''],
      ['TICKETS'],
      ['Date', 'Customer', 'Load ID', 'Location', 'Status'],
      ...tickets.map(t => [t.date, t.customer_name, t.load_id, t.location_loaded, t.status]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `settlement_${driver.name.replace(' ', '_')}_${period.start}_${period.end}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Driver Settlements</h1>
        {settlement && (
          <button onClick={exportCSV} className="text-[#2D7A5F] font-medium text-sm">CSV</button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Parameters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Settlement Parameters</h2>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
              <option value="">Select driver...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.status === 'inactive' ? '(inactive)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Rate / Mile ($)</label>
              <input type="number" step="0.01" value={ratePerMile} onChange={e => setRatePerMile(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Rate / Load ($)</label>
              <input type="number" step="0.01" value={ratePerLoad} onChange={e => setRatePerLoad(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={generateSettlement} disabled={generating}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : '✨ Generate AI Settlement'}
          </button>
        </div>

        {/* Settlement Result */}
        {settlement && (
          <div className="space-y-4">
            {/* Pay summary */}
            <div className="bg-[#2D7A5F] rounded-2xl p-5">
              <p className="text-green-200 text-sm font-medium">Total Settlement</p>
              <p className="text-white text-4xl font-bold mt-1">${settlement.metrics.totalPay.toFixed(2)}</p>
              <p className="text-green-200 text-sm mt-1">{settlement.driver.name} · {settlement.period.start} to {settlement.period.end}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-green-200 text-xs">Mile Pay</p>
                  <p className="text-white font-bold">${settlement.metrics.milePay.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-green-200 text-xs">Load Pay</p>
                  <p className="text-white font-bold">${settlement.metrics.loadPay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3">Performance Metrics</h3>
              {[
                ['Total Loads', settlement.metrics.totalLoads],
                ['Total Miles', settlement.metrics.totalMiles.toLocaleString()],
                ['Total Boxes', settlement.metrics.totalBoxes],
                ['Total Weight', `${settlement.metrics.totalWeight} tons`],
                ['Working Hours', `${settlement.metrics.workingHours} hrs`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-bold">{value}</span>
                </div>
              ))}
            </div>

            {/* State miles */}
            {Object.keys(settlement.stateMiles).length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Miles by State</h3>
                {Object.entries(settlement.stateMiles).map(([state, miles]) => (
                  <div key={state} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 text-sm">{state}</span>
                    <span className="text-gray-800 text-sm font-bold">{miles} mi</span>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary */}
            {settlement.aiSummary && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span>✨</span>
                  <h3 className="font-bold text-gray-700">AI Settlement Summary</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{settlement.aiSummary}</p>
              </div>
            )}

            {/* Ticket list */}
            {settlement.tickets.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Approved Tickets ({settlement.tickets.length})</h3>
                {settlement.tickets.map(t => (
                  <div key={t.id} className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-700">{t.customer_name}</p>
                      <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">📍 {t.location_loaded || '—'} · Load #{t.load_id || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={exportCSV}
              className="w-full border-2 border-[#2D7A5F] text-[#2D7A5F] py-4 rounded-2xl font-semibold">
              📥 Export as CSV
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
