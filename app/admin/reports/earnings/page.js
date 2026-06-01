'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EarningsDashboard() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ratePerMile, setRatePerMile] = useState('0.55')
  const [ratePerLoad, setRatePerLoad] = useState('150')
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/drivers').then(r => r.json()).then(d => setDrivers(Array.isArray(d) ? d : []))
    // Default to current week
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setStartDate(monday.toISOString().split('T')[0])
    setEndDate(sunday.toISOString().split('T')[0])
  }, [])

  async function generate() {
    if (!selectedDriver || !startDate || !endDate) return
    setGenerating(true)
    setReport(null)

    const driver = drivers.find(d => d.id === selectedDriver)
    const params = new URLSearchParams({ driver_id: selectedDriver, start: startDate, end: endDate })

    const [tickets, timesheets] = await Promise.all([
      fetch(`/api/tickets?${params}`).then(r => r.json()),
      fetch(`/api/timesheets?${params}`).then(r => r.json()),
    ])

    const approvedTickets = (Array.isArray(tickets) ? tickets : []).filter(t => t.status === 'approved')
    const workingSheets = (Array.isArray(timesheets) ? timesheets : []).filter(t => t.log_type === 'working')

    // Calculate miles
    const totalMiles = workingSheets.reduce((sum, ts) => {
      return sum + (ts.state_miles?.reduce((s, m) => s + (parseFloat(m.miles) || 0), 0) || 0)
    }, 0)

    // State miles breakdown
    const stateMiles = {}
    workingSheets.forEach(ts => {
      ts.state_miles?.forEach(sm => {
        stateMiles[sm.state] = (stateMiles[sm.state] || 0) + (parseFloat(sm.miles) || 0)
      })
    })

    // Calculate hours
    const totalHours = workingSheets.reduce((sum, ts) => {
      if (!ts.start_time || !ts.end_time) return sum
      const [sh, sm] = ts.start_time.split(':').map(Number)
      const [eh, em] = ts.end_time.split(':').map(Number)
      return sum + Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
    }, 0)

    // Pay calculation
    const milePay = totalMiles * parseFloat(ratePerMile)
    const loadPay = approvedTickets.length * parseFloat(ratePerLoad)
    const totalPay = milePay + loadPay

    // Weight totals
    const totalWeight = approvedTickets.reduce((sum, t) =>
      sum + (t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0) || 0), 0)
    const totalBoxes = approvedTickets.reduce((sum, t) => sum + (t.boxes?.length || 0), 0)

    setReport({
      driver,
      period: `${startDate} to ${endDate}`,
      approvedLoads: approvedTickets.length,
      totalMiles: parseFloat(totalMiles.toFixed(1)),
      totalHours: parseFloat(totalHours.toFixed(1)),
      totalWeight: parseFloat(totalWeight.toFixed(1)),
      totalBoxes,
      milePay: parseFloat(milePay.toFixed(2)),
      loadPay: parseFloat(loadPay.toFixed(2)),
      totalPay: parseFloat(totalPay.toFixed(2)),
      ratePerMile: parseFloat(ratePerMile),
      ratePerLoad: parseFloat(ratePerLoad),
      stateMiles,
      tickets: approvedTickets,
      timesheets: workingSheets,
    })
    setGenerating(false)
  }

  function downloadCSV() {
    if (!report) return
    const rows = [
      ['DRIVER SETTLEMENT SHEET'],
      ['Driver:', report.driver?.name],
      ['Period:', report.period],
      ['Truck #:', report.driver?.truck_number || 'N/A'],
      [''],
      ['SUMMARY'],
      ['Approved Loads:', report.approvedLoads],
      ['Total Miles:', report.totalMiles],
      ['Total Hours:', report.totalHours],
      ['Total Weight (tons):', report.totalWeight],
      [''],
      ['PAY BREAKDOWN'],
      ['Mile Pay:', `$${report.milePay} (${report.totalMiles} mi × $${report.ratePerMile}/mi)`],
      ['Load Pay:', `$${report.loadPay} (${report.approvedLoads} loads × $${report.ratePerLoad}/load)`],
      ['TOTAL PAY:', `$${report.totalPay}`],
      [''],
      ['MILES BY STATE'],
      ['State', 'Miles'],
      ...Object.entries(report.stateMiles).map(([s, m]) => [s, m.toFixed(1)]),
      [''],
      ['APPROVED TICKETS'],
      ['Date', 'Customer', 'Load ID', 'BOL', 'Location', 'Boxes', 'Weight'],
      ...report.tickets.map(t => [
        t.date, t.customer_name, t.load_id || 'N/A', t.bol_number || 'N/A',
        t.location_loaded || 'N/A',
        t.boxes?.length || 0,
        t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0).toFixed(1) || 0
      ]),
    ]
    const csv = rows.map(r => Array.isArray(r) ? r.join(',') : r).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Settlement_${report.driver?.name?.replace(/\s/g, '_')}_${startDate}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Driver Earnings</h1>
        {report && <button onClick={downloadCSV} className="text-[#2D7A5F] text-sm font-medium">⬇ CSV</button>}
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Settlement Settings</h2>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
              <option value="">Select driver...</option>
              {drivers.filter(d => d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>{d.name} — Truck #{d.truck_number || 'N/A'}</option>
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
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">$/Mile</label>
              <input type="number" value={ratePerMile} onChange={e => setRatePerMile(e.target.value)}
                step="0.01" placeholder="0.55"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">$/Load</label>
              <input type="number" value={ratePerLoad} onChange={e => setRatePerLoad(e.target.value)}
                step="1" placeholder="150"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>

          <button onClick={generate} disabled={generating || !selectedDriver}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {generating ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Calculating...</>
            ) : '💰 Generate Settlement'}
          </button>
        </div>

        {report && (
          <>
            {/* Driver card */}
            <div className="bg-[#2D7A5F] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {report.driver?.name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-lg">{report.driver?.name}</p>
                  <p className="text-green-200 text-sm">Truck #{report.driver?.truck_number || 'N/A'} · {report.period}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-green-200 text-sm">Total Earnings</p>
                <p className="text-4xl font-bold mt-1">${report.totalPay.toFixed(2)}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Approved Loads', value: report.approvedLoads, icon: '🎫' },
                { label: 'Miles Driven', value: report.totalMiles.toLocaleString(), icon: '🛣️' },
                { label: 'Hours Worked', value: report.totalHours.toFixed(1), icon: '🕐' },
                { label: 'Total Weight', value: report.totalWeight + 't', icon: '⚖️' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pay breakdown */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3">Pay Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Mile Pay</p>
                    <p className="text-xs text-gray-400">{report.totalMiles} mi × ${report.ratePerMile}/mi</p>
                  </div>
                  <p className="font-bold text-gray-800">${report.milePay.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Load Pay</p>
                    <p className="text-xs text-gray-400">{report.approvedLoads} loads × ${report.ratePerLoad}/load</p>
                  </div>
                  <p className="font-bold text-gray-800">${report.loadPay.toFixed(2)}</p>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <p className="font-bold text-gray-800">Total</p>
                  <p className="font-bold text-[#2D7A5F] text-xl">${report.totalPay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* State miles */}
            {Object.keys(report.stateMiles).length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Miles by State</h3>
                {Object.entries(report.stateMiles)
                  .filter(([s]) => s !== 'Unknown')
                  .sort((a, b) => b[1] - a[1])
                  .map(([state, miles]) => (
                    <div key={state} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-700">{state}</p>
                      <p className="text-sm font-medium text-gray-800">{parseFloat(miles).toFixed(1)} mi</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Ticket list */}
            {report.tickets.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Approved Tickets ({report.tickets.length})</h3>
                {report.tickets.map((t, i) => (
                  <div key={t.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-800">{t.customer_name}</p>
                      <p className="text-xs text-gray-400">{t.date}</p>
                    </div>
                    <p className="text-xs text-gray-400">Load #{t.load_id || 'N/A'} · {t.location_loaded || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
