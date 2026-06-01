'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const QUARTERS = [
  { label: 'Q1 2026 (Jan-Mar)', start: '2026-01-01', end: '2026-03-31' },
  { label: 'Q2 2026 (Apr-Jun)', start: '2026-04-01', end: '2026-06-30' },
  { label: 'Q3 2026 (Jul-Sep)', start: '2026-07-01', end: '2026-09-30' },
  { label: 'Q4 2026 (Oct-Dec)', start: '2026-10-01', end: '2026-12-31' },
  { label: 'Q1 2025 (Jan-Mar)', start: '2025-01-01', end: '2025-03-31' },
  { label: 'Q2 2025 (Apr-Jun)', start: '2025-04-01', end: '2025-06-30' },
  { label: 'Q3 2025 (Jul-Sep)', start: '2025-07-01', end: '2025-09-30' },
  { label: 'Q4 2025 (Oct-Dec)', start: '2025-10-01', end: '2025-12-31' },
]

// IFTA diesel tax rates per state (cents per gallon) - 2025 rates
const IFTA_RATES = {
  'Alabama': 28.3, 'Alaska': 14.7, 'Arizona': 28.0, 'Arkansas': 28.5,
  'California': 102.7, 'Colorado': 20.5, 'Connecticut': 49.5, 'Delaware': 22.0,
  'Florida': 35.4, 'Georgia': 32.6, 'Idaho': 32.0, 'Illinois': 52.0,
  'Indiana': 55.0, 'Iowa': 32.5, 'Kansas': 26.0, 'Kentucky': 26.0,
  'Louisiana': 20.0, 'Maine': 31.2, 'Maryland': 36.7, 'Massachusetts': 24.0,
  'Michigan': 47.5, 'Minnesota': 28.5, 'Mississippi': 18.4, 'Missouri': 17.0,
  'Montana': 29.5, 'Nebraska': 24.6, 'Nevada': 27.8, 'New Hampshire': 23.8,
  'New Jersey': 47.1, 'New Mexico': 22.9, 'New York': 46.6, 'North Carolina': 38.5,
  'North Dakota': 23.0, 'Ohio': 47.0, 'Oklahoma': 19.0, 'Oregon': 38.0,
  'Pennsylvania': 74.1, 'Rhode Island': 34.0, 'South Carolina': 28.75,
  'South Dakota': 28.0, 'Tennessee': 27.4, 'Texas': 20.0, 'Utah': 31.9,
  'Vermont': 32.0, 'Virginia': 27.8, 'Washington': 49.4, 'West Virginia': 35.7,
  'Wisconsin': 32.9, 'Wyoming': 24.0,
}

export default function IFTAReport() {
  const router = useRouter()
  const [quarter, setQuarter] = useState(QUARTERS[1])
  const [mpg, setMpg] = useState('6.5')
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState('all')

  useEffect(() => {
    fetch('/api/drivers').then(r => r.json()).then(d => setDrivers(Array.isArray(d) ? d : []))
  }, [])

  async function generate() {
    setGenerating(true)
    setReport(null)

    const params = new URLSearchParams({
      start: quarter.start,
      end: quarter.end,
    })
    if (selectedDriver !== 'all') params.set('driver_id', selectedDriver)

    const ts = await fetch(`/api/timesheets?${params}`).then(r => r.json())
    const sessions = await fetch(`/api/tracking?start=${quarter.start}&end=${quarter.end}${selectedDriver !== 'all' ? '&driver_id=' + selectedDriver : ''}`).then(r => r.json()).catch(() => [])

    // Aggregate state miles from timesheets
    const stateMiles = {}
    const driverMiles = {}

    for (const t of (Array.isArray(ts) ? ts : [])) {
      const dName = t.drivers?.name || t.driver_id
      if (!driverMiles[dName]) driverMiles[dName] = {}

      for (const sm of (t.state_miles || [])) {
        const state = sm.state
        const miles = parseFloat(sm.miles) || 0
        stateMiles[state] = (stateMiles[state] || 0) + miles
        driverMiles[dName][state] = (driverMiles[dName][state] || 0) + miles
      }
    }

    // Also pull from drive_sessions
    for (const s of (Array.isArray(sessions) ? sessions : [])) {
      for (const sm of (s.state_miles || [])) {
        const state = sm.state
        const miles = parseFloat(sm.miles) || 0
        stateMiles[state] = (stateMiles[state] || 0) + miles
      }
    }

    const fuelEfficiency = parseFloat(mpg) || 6.5
    const totalMiles = Object.values(stateMiles).reduce((a, b) => a + b, 0)
    const totalGallons = totalMiles / fuelEfficiency

    // Calculate tax per state
    const stateBreakdown = Object.entries(stateMiles)
      .filter(([state, miles]) => miles > 0 && state !== 'Unknown')
      .map(([state, miles]) => {
        const gallonsUsed = miles / fuelEfficiency
        const rate = (IFTA_RATES[state] || 20) / 100
        const taxOwed = gallonsUsed * rate
        return { state, miles: parseFloat(miles.toFixed(1)), gallonsUsed: parseFloat(gallonsUsed.toFixed(2)), rate: IFTA_RATES[state] || 20, taxOwed: parseFloat(taxOwed.toFixed(2)) }
      })
      .sort((a, b) => b.miles - a.miles)

    const totalTax = stateBreakdown.reduce((sum, s) => sum + s.taxOwed, 0)

    setReport({
      quarter: quarter.label,
      totalMiles: parseFloat(totalMiles.toFixed(1)),
      totalGallons: parseFloat(totalGallons.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      stateBreakdown,
      driverMiles,
      mpg: fuelEfficiency,
    })
    setGenerating(false)
  }

  function downloadCSV() {
    if (!report) return
    const rows = [
      ['IFTA Fuel Tax Report - ' + report.quarter],
      ['Generated:', new Date().toLocaleDateString()],
      ['Fleet MPG:', report.mpg],
      [''],
      ['State', 'Miles', 'Gallons Used', 'Tax Rate (¢/gal)', 'Tax Owed ($)'],
      ...report.stateBreakdown.map(s => [s.state, s.miles, s.gallonsUsed, s.rate, s.taxOwed]),
      [''],
      ['TOTALS', report.totalMiles, report.totalGallons, '', report.totalTax],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IFTA_${report.quarter.replace(/[^a-z0-9]/gi, '_')}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">IFTA Fuel Tax Report</h1>
        {report && (
          <button onClick={downloadCSV} className="text-[#2D7A5F] text-sm font-medium">⬇ CSV</button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Settings */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Report Settings</h2>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Quarter</label>
            <select value={quarter.label} onChange={e => setQuarter(QUARTERS.find(q => q.label === e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
              {QUARTERS.map(q => <option key={q.label} value={q.label}>{q.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
              <option value="all">All Drivers (Fleet)</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fleet MPG (avg)</label>
            <input type="number" value={mpg} onChange={e => setMpg(e.target.value)}
              step="0.1" min="3" max="15"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            <p className="text-xs text-gray-400 mt-1">Typical diesel semi: 6.0–7.5 mpg</p>
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {generating ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Calculating...</>
            ) : '📊 Generate IFTA Report'}
          </button>
        </div>

        {/* Results */}
        {report && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Miles', value: report.totalMiles.toLocaleString(), icon: '🛣️' },
                { label: 'Gallons Used', value: report.totalGallons.toLocaleString(), icon: '⛽' },
                { label: 'Tax Owed', value: '$' + report.totalTax.toFixed(2), icon: '💰' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-xl mb-1">{s.icon}</p>
                  <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* State breakdown */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3">Miles by State</h3>
              <div className="space-y-2">
                {report.stateBreakdown.map(s => (
                  <div key={s.state} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{s.state}</p>
                      <p className="text-xs text-gray-400">{s.miles} mi · {s.gallonsUsed} gal · {s.rate}¢/gal</p>
                    </div>
                    <p className="font-bold text-gray-800 text-sm">${s.taxOwed.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                <p className="font-bold text-gray-800">Total Tax Owed</p>
                <p className="font-bold text-[#2D7A5F] text-lg">${report.totalTax.toFixed(2)}</p>
              </div>
            </div>

            {/* Driver breakdown */}
            {Object.keys(report.driverMiles).length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Miles by Driver</h3>
                {Object.entries(report.driverMiles).map(([driver, states]) => {
                  const total = Object.values(states).reduce((a, b) => a + b, 0)
                  return (
                    <div key={driver} className="mb-3 pb-3 border-b border-gray-50 last:border-0">
                      <div className="flex justify-between mb-1">
                        <p className="font-medium text-gray-800 text-sm">{driver}</p>
                        <p className="font-bold text-gray-700 text-sm">{total.toFixed(1)} mi</p>
                      </div>
                      {Object.entries(states).map(([state, miles]) => (
                        <div key={state} className="flex justify-between text-xs text-gray-400 ml-2">
                          <span>{state}</span>
                          <span>{miles.toFixed(1)} mi</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="bg-yellow-50 rounded-2xl p-4">
              <p className="text-yellow-800 text-xs font-medium">⚠️ Disclaimer</p>
              <p className="text-yellow-700 text-xs mt-1">This report is an estimate based on GPS and timesheet data. Verify with your accountant before filing. Tax rates updated for 2025 — confirm current rates at iftach.org before submitting.</p>
            </div>
          </>
        )}

        {report?.stateBreakdown.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-gray-700">No mileage data found</p>
            <p className="text-sm text-gray-400 mt-1">Make sure drivers have completed trips with GPS tracking for this quarter</p>
          </div>
        )}
      </div>
    </div>
  )
}
