'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FuelLog() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    state: '',
    city: '',
    gallons: '',
    price_per_gallon: '',
    odometer: '',
    notes: '',
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const d = await fetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
    setDriver(d)
    const { data } = await supabase
      .from('fuel_logs')
      .select('*')
      .eq('driver_id', d.id)
      .order('date', { ascending: false })
      .limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.date || !form.gallons || !form.price_per_gallon) return
    setSaving(true)
    const total_cost = parseFloat(form.gallons) * parseFloat(form.price_per_gallon)
    await supabase.from('fuel_logs').insert({
      driver_id: driver.id,
      date: form.date,
      state: form.state,
      city: form.city,
      gallons: parseFloat(form.gallons),
      price_per_gallon: parseFloat(form.price_per_gallon),
      total_cost: parseFloat(total_cost.toFixed(2)),
      odometer: form.odometer ? parseInt(form.odometer) : null,
      notes: form.notes || null,
    })
    setForm({ date: new Date().toISOString().split('T')[0], state: '', city: '', gallons: '', price_per_gallon: '', odometer: '', notes: '' })
    setShowForm(false)
    setSaving(false)
    await init()
  }

  const totalGallons = logs.reduce((s, l) => s + (l.gallons || 0), 0)
  const totalCost = logs.reduce((s, l) => s + (l.total_cost || 0), 0)
  const avgPPG = logs.length ? totalCost / totalGallons : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Fuel Log</h1>
        <button onClick={() => setShowForm(true)} className="text-[#2D7A5F] font-medium text-sm">+ Add</button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Gallons', value: totalGallons.toFixed(1), icon: '⛽' },
            { label: 'Total Cost', value: '$' + totalCost.toFixed(2), icon: '💵' },
            { label: 'Avg $/Gal', value: '$' + avgPPG.toFixed(3), icon: '📊' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-base font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">⛽</p>
            <p className="font-medium text-gray-700">No fuel logs yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap + Add to log a fuel stop</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {logs.map(l => (
              <div key={l.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{l.gallons} gal · ${l.price_per_gallon}/gal</p>
                    <p className="text-xs text-gray-400 mt-0.5">{l.date}{l.city ? ` · ${l.city}` : ''}{l.state ? `, ${l.state}` : ''}</p>
                    {l.odometer && <p className="text-xs text-gray-400">Odometer: {l.odometer.toLocaleString()}</p>}
                  </div>
                  <p className="font-bold text-[#2D7A5F]">${l.total_cost?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="bg-black/30 absolute inset-0" onClick={() => setShowForm(false)} />
          <div className="bg-white rounded-t-3xl w-full p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-800 text-lg">Log Fuel Stop</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase">State</label>
                <input value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                  placeholder="TX" className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase">City / Station</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                placeholder="e.g. Loves Travel Stop, Odessa"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase">Gallons</label>
                <input type="number" value={form.gallons} onChange={e => setForm({...form, gallons: e.target.value})}
                  placeholder="150.0" step="0.1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase">$/Gallon</label>
                <input type="number" value={form.price_per_gallon} onChange={e => setForm({...form, price_per_gallon: e.target.value})}
                  placeholder="3.89" step="0.001"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>
            {form.gallons && form.price_per_gallon && (
              <div className="bg-[#E8F5F0] rounded-xl p-3 text-center">
                <p className="text-[#2D7A5F] font-bold text-lg">
                  Total: ${(parseFloat(form.gallons) * parseFloat(form.price_per_gallon)).toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase">Odometer (optional)</label>
              <input type="number" value={form.odometer} onChange={e => setForm({...form, odometer: e.target.value})}
                placeholder="125000"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving || !form.gallons || !form.price_per_gallon}
                className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
