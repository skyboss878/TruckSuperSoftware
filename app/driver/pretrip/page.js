'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CHECKLIST = [
  { key: 'brakes',    label: 'Brakes',              icon: '🛑', desc: 'Air lines, pressure, brake chambers' },
  { key: 'tires',     label: 'Tires & Wheels',       icon: '⭕', desc: 'Tread depth, pressure, lug nuts' },
  { key: 'lights',    label: 'Lights',               icon: '💡', desc: 'Headlights, brake lights, turn signals' },
  { key: 'mirrors',   label: 'Mirrors',              icon: '🪞', desc: 'Clean, adjusted, no cracks' },
  { key: 'steering',  label: 'Steering',             icon: '🎡', desc: 'Steering play, gearbox, pitman arm' },
  { key: 'horn',      label: 'Horn',                 icon: '📯', desc: 'Audible and functional' },
  { key: 'wipers',    label: 'Wipers & Washers',     icon: '🌧️', desc: 'Blades, fluid, operation' },
  { key: 'fuel',      label: 'Fuel Level',           icon: '⛽', desc: 'Adequate fuel for the trip' },
  { key: 'fluids',    label: 'Oil & Fluids',         icon: '🛢️', desc: 'Oil, coolant, power steering' },
  { key: 'emergency', label: 'Emergency Equipment',  icon: '🚨', desc: 'Fire extinguisher, reflectors, first aid' },
  { key: 'cargo',     label: 'Cargo Area',           icon: '📦', desc: 'Secure, clean, no visible damage' },
  { key: 'coupling',  label: 'Coupling Devices',     icon: '🔗', desc: 'Fifth wheel, kingpin, glad hands' },
  { key: 'suspension',label: 'Suspension',           icon: '🔩', desc: 'Springs, shocks, u-bolts' },
  { key: 'docs',      label: 'Documents',            icon: '📄', desc: 'License, registration, insurance' },
]

export default function PreTripPage() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [checks, setChecks] = useState({})
  const [defectNotes, setDefectNotes] = useState({})
  const [globalNotes, setGlobalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0) // 0 = checklist, 1 = confirm

  useEffect(() => {
    loadDriver()
  }, [])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('auth_id', user.id)
      .single()
    if (!data) { router.replace('/login'); return }
    setDriver(data)
  }

  function setCheck(key, value) {
    setChecks(prev => ({ ...prev, [key]: value }))
    if (value === 'pass') {
      setDefectNotes(prev => ({ ...prev, [key]: '' }))
    }
  }

  const totalChecked = CHECKLIST.filter(i => checks[i.key] !== undefined).length
  const allChecked = totalChecked === CHECKLIST.length
  const defects = CHECKLIST.filter(i => checks[i.key] === 'fail')
  const defectsFound = defects.length > 0

  async function handleSubmit() {
    if (!allChecked || !driver) return
    setSaving(true)
    try {
      const items = CHECKLIST.map(i => ({
        key: i.key,
        label: i.label,
        status: checks[i.key],
        notes: defectNotes[i.key] || '',
      }))

      const defectSummary = defects.map(i =>
        `${i.label}${defectNotes[i.key] ? ': ' + defectNotes[i.key] : ''}`
      ).join('; ')

      const res = await fetch('/api/pre-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driver.id,
          truck_number: driver.truck_number,
          items,
          defects_found: defectsFound,
          overall_status: defectsFound ? 'fail' : 'pass',
          notes: defectsFound ? defectSummary : (globalNotes || null),
        }),
      })
      if (!res.ok) throw new Error('Submit failed')
      router.replace('/driver')
    } catch (e) {
      console.error(e)
      alert('Submission failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-[#2D7A5F] px-4 py-5 text-white sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm opacity-80">TruckSuperSoftware</span>
          <span className="text-xs bg-white/20 rounded-full px-3 py-1">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-xl font-bold">🚛 Pre-Trip Inspection</h1>
        <p className="text-sm opacity-80 mt-0.5">{driver.name} · Truck #{driver.truck_number}</p>

        {/* Progress bar */}
        <div className="mt-3 bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${(totalChecked / CHECKLIST.length) * 100}%` }}
          />
        </div>
        <p className="text-xs opacity-70 mt-1">{totalChecked} of {CHECKLIST.length} items checked</p>
      </div>

      {/* Required banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
        <span className="text-amber-600 text-sm">⚠️</span>
        <p className="text-xs text-amber-700 font-medium">
          DOT-required daily inspection · Must complete before driving
        </p>
      </div>

      {/* Checklist */}
      <div className="p-4 space-y-3 pb-36">
        {CHECKLIST.map((item, idx) => {
          const status = checks[item.key]
          return (
            <div
              key={item.key}
              className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                status === 'pass' ? 'border-green-400' :
                status === 'fail' ? 'border-red-400' :
                'border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setCheck(item.key, 'pass')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'pass'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >✓ OK</button>
                  <button
                    onClick={() => setCheck(item.key, 'fail')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'fail'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >✗ Defect</button>
                </div>
              </div>

              {/* Defect notes field */}
              {status === 'fail' && (
                <div className="mt-3 ml-9">
                  <input
                    type="text"
                    placeholder="Describe the defect..."
                    value={defectNotes[item.key] || ''}
                    onChange={e => setDefectNotes(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400 bg-red-50 placeholder-red-300"
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Global notes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes (optional)</label>
          <textarea
            value={globalNotes}
            onChange={e => setGlobalNotes(e.target.value)}
            placeholder="Any other observations..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-2 text-sm outline-none focus:border-[#2D7A5F] resize-none"
          />
        </div>
      </div>

      {/* Bottom submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4 shadow-lg">
        {defectsFound && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <p className="text-xs text-red-700 font-medium">
              {defects.length} defect{defects.length > 1 ? 's' : ''} flagged — admin will be notified
            </p>
          </div>
        )}
        {allChecked && !defectsFound && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <span>✅</span>
            <p className="text-xs text-green-700 font-medium">All items passed — vehicle is road-ready</p>
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allChecked || saving}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            allChecked
              ? defectsFound
                ? 'bg-red-500 text-white active:opacity-80'
                : 'bg-[#2D7A5F] text-white active:opacity-80'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {saving ? 'Submitting...' :
           !allChecked ? `Check all items (${CHECKLIST.length - totalChecked} left)` :
           defectsFound ? `Submit & Report ${defects.length} Defect${defects.length > 1 ? 's' : ''}` :
           'Submit & Enter Dashboard'}
        </button>
      </div>
    </div>
  )
}
