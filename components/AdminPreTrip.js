'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPreTrip() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('pretrip-admin')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pre_trip_inspections',
      }, () => loadData())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/pre-trip?admin=true')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('PreTrip admin load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-gray-400 text-sm animate-pulse">Loading inspections...</div>
    </div>
  )

  if (!data) return null

  const drivers = data.drivers || []
  const completed = drivers.filter(d => d.inspection)
  const pending = drivers.filter(d => !d.inspection)
  const defects = drivers.filter(d => d.inspection?.defects_found)
  const passed = drivers.filter(d => d.inspection && !d.inspection.defects_found)

  return (
    <div className="space-y-4">

      {/* Live header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Pre-Trip Status</h2>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Live</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: drivers.length, color: 'bg-gray-50 text-gray-700', border: 'border-gray-200' },
          { label: 'Passed', value: passed.length, color: 'bg-green-50 text-green-700', border: 'border-green-200' },
          { label: 'Defects', value: defects.length, color: 'bg-red-50 text-red-700', border: 'border-red-200' },
          { label: 'Pending', value: pending.length, color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border ${s.border} rounded-2xl p-3 text-center`}>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Defect alert banner */}
      {defects.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-3 flex items-start gap-3">
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-bold text-red-700 text-sm">
              {defects.length} vehicle{defects.length > 1 ? 's' : ''} with defects
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {defects.map(d => `Truck #${d.truck_number}`).join(', ')} — review before dispatch
            </p>
          </div>
        </div>
      )}

      {/* Driver list */}
      <div className="space-y-2">

        {/* Defects first */}
        {defects.map(d => (
          <DriverCard key={d.id} driver={d} status="defect" onSelect={setSelected} selected={selected} />
        ))}

        {/* Pending */}
        {pending.map(d => (
          <DriverCard key={d.id} driver={d} status="pending" onSelect={setSelected} selected={selected} />
        ))}

        {/* Passed */}
        {passed.map(d => (
          <DriverCard key={d.id} driver={d} status="pass" onSelect={setSelected} selected={selected} />
        ))}
      </div>

      {/* Detail drawer */}
      {selected && selected.inspection && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">{selected.name}</h3>
                <p className="text-xs text-gray-400">Truck #{selected.truck_number} · {new Date(selected.inspection.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                selected.inspection.overall_status === 'pass'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {selected.inspection.overall_status === 'pass' ? '✅ PASSED' : '⚠️ DEFECTS'}
              </span>
            </div>

            <div className="space-y-2">
              {(selected.inspection.items || []).map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                  item.status === 'fail' ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <span className={`text-lg mt-0.5 ${item.status === 'fail' ? '' : 'opacity-40'}`}>
                    {item.status === 'pass' ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.status === 'fail' ? 'text-red-700' : 'text-gray-600'}`}>
                      {item.label}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-red-500 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selected.inspection.notes && (
              <div className="mt-3 bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700">Notes</p>
                <p className="text-sm text-amber-800 mt-1">{selected.inspection.notes}</p>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full mt-4 py-3 bg-gray-100 rounded-2xl text-sm font-semibold text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DriverCard({ driver, status, onSelect, selected }) {
  const insp = driver.inspection
  const isSelected = selected?.id === driver.id

  const config = {
    pass:    { bg: 'bg-white', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: '✅', label: 'Passed' },
    defect:  { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', icon: '⚠️', label: 'Defects' },
    pending: { bg: 'bg-white', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: '⏳', label: 'Not done' },
  }[status]

  return (
    <button
      onClick={() => insp ? onSelect(driver) : null}
      className={`w-full text-left ${config.bg} border-2 ${config.border} rounded-2xl p-4 flex items-center gap-3 transition-all ${insp ? 'active:opacity-70' : ''}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${
        status === 'defect' ? 'bg-red-500' : status === 'pass' ? 'bg-[#2D7A5F]' : 'bg-amber-400'
      }`}>
        {driver.name?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{driver.name}</p>
        <p className="text-xs text-gray-400">Truck #{driver.truck_number}</p>
        {insp?.notes && status === 'defect' && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{insp.notes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.icon} {config.label}
        </span>
        {insp && (
          <span className="text-xs text-gray-300">
            {new Date(insp.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        {insp && <span className="text-xs text-[#2D7A5F]">Tap to review →</span>}
      </div>
    </button>
  )
}
