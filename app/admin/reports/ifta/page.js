'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3)

export default function IFTAReport() {
  const router = useRouter()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    authFetch('/api/me').then(r => r.json()).then(d => { if (d?.company?.name) setCompanyName(d.company.name) })
    loadReport() }, [quarter, year])

  async function loadReport() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await authFetch(`/api/ifta?quarter=${quarter}&year=${year}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const json = await res.json()
      if (json.error) { console.error('IFTA error:', json.error); return; }
      setData(json)
    } catch (e) {
      console.error('IFTA load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (!data) return
    const rows = [
      ['IFTA Quarterly Fuel Tax Report'],
      [`Q${data.quarter} ${data.year} — ${data.startDate} to ${data.endDate}`],
      [],
      ['State', 'Miles', 'Fuel Consumed (gal)', 'Fuel Purchased (gal)', 'Net Gallons', 'Tax Rate ($/gal)', 'Tax Owed ($)'],
      ...data.states.map(s => [
        s.state,
        s.miles,
        s.fuelConsumed,
        s.fuelPurchased,
        s.netGallons,
        s.taxRate,
        s.taxOwed,
      ]),
      [],
      ['TOTALS', data.summary.totalMiles, '', data.summary.totalGallons, '', '', data.summary.totalTaxOwed],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IFTA_Q${data.quarter}_${data.year}.csv`
    a.click()
  }

  const s = data?.summary

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">IFTA Fuel Tax</h1>
        {data && (
          <button onClick={exportCSV} className="text-[#2D7A5F] text-sm font-medium">⬇ CSV</button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-10">

        {/* Quarter / Year selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Report Period</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Quarter</label>
              <div className="grid grid-cols-4 gap-1">
                {[1,2,3,4].map(q => (
                  <button key={q} onClick={() => setQuarter(q)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${
                      quarter === q ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    Q{q}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Year</label>
              <div className="grid grid-cols-2 gap-1">
                {[CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                  <button key={y} onClick={() => setYear(y)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${
                      year === y ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {data && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              {data.startDate} → {data.endDate} · {s.sessions} trips · {s.fuelStops} fuel stops
            </p>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400 animate-pulse">Calculating report...</div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Miles', value: s.totalMiles?.toLocaleString(), icon: '🛣️' },
                { label: 'Total Gallons', value: s.totalGallons?.toFixed(1), icon: '⛽' },
                { label: 'Avg MPG', value: s.avgMPG?.toFixed(2), icon: '📊' },
                { label: 'States Operated', value: s.statesOperated, icon: '🗺️' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-2xl mb-1">{c.icon}</p>
                  <p className="text-xl font-bold text-gray-800">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Tax summary */}
            <div className={`rounded-2xl p-5 text-center ${
              s.totalTaxOwed > 0 ? 'bg-red-50 border-2 border-red-200' :
              s.totalTaxOwed < 0 ? 'bg-green-50 border-2 border-green-200' :
              'bg-gray-50 border-2 border-gray-200'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Q{data.quarter} {data.year} Net Tax
              </p>
              <p className={`text-4xl font-bold ${
                s.totalTaxOwed > 0 ? 'text-red-600' :
                s.totalTaxOwed < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {s.totalTaxOwed < 0 ? '-' : ''}${Math.abs(s.totalTaxOwed).toFixed(2)}
              </p>
              <p className={`text-sm mt-1 font-medium ${
                s.totalTaxOwed > 0 ? 'text-red-500' :
                s.totalTaxOwed < 0 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {s.totalTaxOwed > 0 ? '⚠️ Tax owed to IFTA' :
                 s.totalTaxOwed < 0 ? '✅ Credit due to you' : 'No tax liability'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Fuel purchased: ${s.totalFuelCost?.toFixed(2)}</p>
            </div>

            {/* State breakdown */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-700">State Breakdown</h3>
                <span className="text-xs text-gray-400">{data.states.length} states</span>
              </div>

              {data.states.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm">No trip data for this period</p>
                  <p className="text-xs mt-1">Make sure drivers have completed trips and logged fuel</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.states.map(s => (
                    <div key={s.state}>
                      <button
                        onClick={() => setExpanded(expanded === s.state ? null : s.state)}
                        className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-50 text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          s.taxOwed > 0 ? 'bg-red-100 text-red-700' :
                          s.taxOwed < 0 ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {s.state}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{s.miles.toLocaleString()} mi</p>
                          <p className="text-xs text-gray-400">{s.fuelPurchased.toFixed(1)} gal purchased</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${
                            s.taxOwed > 0 ? 'text-red-600' :
                            s.taxOwed < 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {s.taxOwed >= 0 ? '' : '-'}${Math.abs(s.taxOwed).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-300">{expanded === s.state ? '▲' : '▼'}</p>
                        </div>
                      </button>

                      {expanded === s.state && (
                        <div className="bg-gray-50 px-4 py-3 space-y-2 border-t border-gray-100">
                          {[
                            ['Miles in state', s.miles.toLocaleString() + ' mi'],
                            ['Fuel consumed', s.fuelConsumed.toFixed(3) + ' gal'],
                            ['Fuel purchased', s.fuelPurchased.toFixed(3) + ' gal'],
                            ['Net gallons', (s.netGallons >= 0 ? '+' : '') + s.netGallons.toFixed(3) + ' gal'],
                            ['Tax rate', '$' + s.taxRate.toFixed(3) + '/gal'],
                            ['Tax owed', (s.taxOwed >= 0 ? '+' : '-') + '$' + Math.abs(s.taxOwed).toFixed(2)],
                          ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-gray-500">{label}</span>
                              <span className="font-medium text-gray-800">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-blue-800 text-xs font-semibold">📋 IFTA Filing Reminder</p>
              <p className="text-blue-700 text-xs mt-1">
                Q1 due Apr 30 · Q2 due Jul 31 · Q3 due Oct 31 · Q4 due Jan 31.
                Tax rates are approximate — verify with your base jurisdiction before filing.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
