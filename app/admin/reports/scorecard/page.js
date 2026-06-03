'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GRADE_COLORS = {
  A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', bar: 'bg-green-500' },
  B: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', bar: 'bg-blue-500' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', bar: 'bg-yellow-500' },
  D: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', bar: 'bg-orange-500' },
  F: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', bar: 'bg-red-500' },
}

export default function DriverScorecard() {
  const router = useRouter()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadData() }, [days])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/scorecard?days=${days}`)
      const json = await res.json()
      setData(Array.isArray(json) ? json : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const avgScore = data.length
    ? Math.round(data.reduce((s, d) => s + d.safety.score, 0) / data.length)
    : 0

  const topDriver = data[0]
  const needsAttention = data.filter(d => d.safety.score < 70)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Driver Scorecards</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-4 pb-10">

        {/* Period selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Period</p>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  days === d ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                {d === 7 ? '7 Days' : d === 30 ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400 animate-pulse">Calculating scores...</div>
        )}

        {!loading && data.length > 0 && (
          <>
            {/* Fleet summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#2D7A5F]">{avgScore}</p>
                <p className="text-xs text-gray-400">Fleet Avg</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <p className="text-2xl font-bold text-green-600">{data.filter(d => d.safety.grade === 'A').length}</p>
                <p className="text-xs text-gray-400">A-Grade</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 shadow-sm text-center border border-red-100">
                <p className="text-2xl font-bold text-red-600">{needsAttention.length}</p>
                <p className="text-xs text-red-400">Need Attention</p>
              </div>
            </div>

            {/* Needs attention alert */}
            {needsAttention.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="font-bold text-red-700 text-sm mb-1">⚠️ Drivers Below 70</p>
                <p className="text-xs text-red-600">
                  {needsAttention.map(d => `${d.driver.name} (${d.safety.score})`).join(', ')}
                </p>
              </div>
            )}

            {/* Top performer */}
            {topDriver && topDriver.safety.grade === 'A' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-green-800 text-sm">Top Performer</p>
                  <p className="text-xs text-green-600">{topDriver.driver.name} · Score {topDriver.safety.score} · {topDriver.miles.total} mi</p>
                </div>
              </div>
            )}

            {/* Driver cards */}
            <div className="space-y-3">
              {data.map(d => {
                const g = GRADE_COLORS[d.safety.grade]
                const isExpanded = expanded === d.driver.id
                return (
                  <div key={d.driver.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${g.border}`}>

                    {/* Card header */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : d.driver.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${g.bg}`}>
                          <span className={`text-xl font-black ${g.text}`}>{d.safety.grade}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800">{d.driver.name}</p>
                          <p className="text-xs text-gray-400">Truck #{d.driver.truck_number} · {d.miles.total} mi</p>
                          {/* Score bar */}
                          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${g.bar}`}
                              style={{ width: `${d.safety.score}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-2xl font-black ${g.text}`}>{d.safety.score}</p>
                          <p className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">

                        {/* Quick stats grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Loads', value: d.tickets.total, sub: `${d.tickets.approved} approved`, icon: '🎫' },
                            { label: 'Miles', value: d.miles.total.toLocaleString(), sub: `${d.miles.trips} trips`, icon: '🛣️' },
                            { label: 'Pre-Trips', value: d.pretrip.completed, sub: `${d.pretrip.defects} defects`, icon: '✅' },
                            { label: 'HOS Alerts', value: d.safety.hos_violations, sub: d.safety.hos_violations > 0 ? 'violations' : 'clean', icon: '⏱️' },
                          ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl p-3">
                              <p className="text-lg mb-0.5">{s.icon}</p>
                              <p className="text-lg font-bold text-gray-800">{s.value}</p>
                              <p className="text-xs text-gray-400">{s.label}</p>
                              <p className="text-xs text-gray-300">{s.sub}</p>
                            </div>
                          ))}
                        </div>

                        {/* Score breakdown */}
                        <div className="bg-white rounded-xl p-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Breakdown</p>
                          {[
                            { label: 'Base score', value: '+100' },
                            d.safety.hos_violations > 0 && { label: `HOS violations (×${d.safety.hos_violations})`, value: `-${d.safety.hos_violations * 10}`, red: true },
                            d.pretrip.defect_rate > 0 && { label: `Pre-trip defect rate (${d.pretrip.defect_rate}%)`, value: `-${Math.round(d.pretrip.defect_rate * 0.5)}`, red: true },
                            d.safety.maintenance_reported > 0 && { label: `Maintenance issues (×${d.safety.maintenance_reported})`, value: `-${d.safety.maintenance_reported * 2}`, red: true },
                          ].filter(Boolean).map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-500">{item.label}</span>
                              <span className={`font-bold ${item.red ? 'text-red-500' : 'text-green-600'}`}>{item.value}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm border-t pt-2 mt-1">
                            <span className="font-bold text-gray-700">Final score</span>
                            <span className={`font-black text-lg ${g.text}`}>{d.safety.score}</span>
                          </div>
                        </div>

                        {/* On-time rate */}
                        {d.tickets.on_time_rate !== null && (
                          <div className="bg-white rounded-xl p-3">
                            <div className="flex justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-700">Load Approval Rate</p>
                              <p className="text-sm font-bold text-[#2D7A5F]">{d.tickets.on_time_rate}%</p>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#2D7A5F] rounded-full"
                                style={{ width: `${d.tickets.on_time_rate}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-blue-800 text-xs font-semibold">📊 Score Formula</p>
              <p className="text-blue-700 text-xs mt-1">
                100 base · −10 per HOS violation · −0.5× pre-trip defect rate · −2 per maintenance issue reported
              </p>
            </div>
          </>
        )}

        {!loading && data.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium">No driver data yet</p>
            <p className="text-sm mt-1">Scores appear once drivers start logging trips</p>
          </div>
        )}
      </div>
    </div>
  )
}
