'use client'
import { authFetch } from '@/lib/api-client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast, { showToast } from '@/components/Toast'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function FuelLog() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [driver, setDriver] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    state: '', city: '', gallons: '',
    price_per_gallon: '', odometer: '', notes: '',
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const d = await authFetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
    setDriver(d)
    if (d?.id) {
      const { data } = await supabase.from('fuel_logs').select('*').eq('driver_id', d.id).order('date', { ascending: false }).limit(30)
      setLogs(data || [])
    }
    setLoading(false)
  }

  async function scanReceipt(file) {
    if (!file) return
    setScanning(true)
    setScanPreview(URL.createObjectURL(file))
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const response = await authFetch('/api/fuel-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, media_type: file.type || 'image/jpeg' }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      const d = result.data
      setForm(prev => ({
        ...prev,
        gallons: d.gallons?.toString() || prev.gallons,
        price_per_gallon: d.price_per_gallon?.toString() || prev.price_per_gallon,
        state: d.state || prev.state,
        city: d.city || prev.city,
        date: d.date || prev.date,
        notes: d.station_name ? `${d.station_name}${d.fuel_type ? ' - ' + d.fuel_type : ''}` : prev.notes,
        odometer: d.odometer?.toString() || prev.odometer,
      }))
      showToast('Receipt scanned — review and confirm')
      setShowForm(true)
    } catch(e) {
      showToast('Could not read receipt — fill in manually', 'error')
      setShowForm(true)
    }
    setScanning(false)
  }

  async function handleSave() {
    if (!form.gallons || !form.price_per_gallon) return
    setSaving(true)
    const total_cost = parseFloat(form.gallons) * parseFloat(form.price_per_gallon)
    await authFetch('/api/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_id: driver.auth_id,
        date: form.date, state: form.state, city: form.city,
        gallons: parseFloat(form.gallons),
        price_per_gallon: parseFloat(form.price_per_gallon),
        total_cost,
        odometer: form.odometer ? parseInt(form.odometer) : null,
        notes: form.notes || null,
      }),
    })
    setForm({ date: new Date().toISOString().split('T')[0], state: '', city: '', gallons: '', price_per_gallon: '', odometer: '', notes: '' })
    setScanPreview(null)
    setShowForm(false)
    setSaving(false)
    showToast('Fuel log saved!')
    const { data } = await supabase.from('fuel_logs').select('*').eq('driver_id', driver.id).order('date', { ascending: false }).limit(30)
    setLogs(data || [])
  }

  const totalGallons = logs.reduce((s, l) => s + (l.gallons || 0), 0)
  const totalCost = logs.reduce((s, l) => s + (l.total_cost || 0), 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">Back</button>
        <h1 className="text-lg font-bold text-gray-800">Fuel Log</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#2D7A5F] rounded-2xl p-4 text-white text-center">
            <p className="text-2xl font-black">{totalGallons.toFixed(0)}</p>
            <p className="text-green-200 text-xs mt-1">Total Gallons</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-gray-800">${totalCost.toFixed(0)}</p>
            <p className="text-gray-400 text-xs mt-1">Total Spent</p>
          </div>
        </div>

        {!showForm && (
          <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #0d2419)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(45,122,95,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>🤖</span>
              <div>
                <p style={{ color: 'white', fontWeight: '800', fontSize: '15px', margin: 0 }}>AI Receipt Scanner</p>
                <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>Snap your receipt — AI fills everything</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) scanReceipt(e.target.files[0]) }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={scanning}
                style={{ padding: '12px', background: '#2D7A5F', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: scanning ? 0.6 : 1 }}>
                {scanning ? 'Scanning...' : '📷 Scan Receipt'}
              </button>
              <button onClick={() => setShowForm(true)}
                style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Edit Manual Entry
              </button>
            </div>
          </div>
        )}

        {scanPreview && (
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <p className="text-xs text-gray-400 font-semibold mb-2">SCANNED RECEIPT</p>
            <img src={scanPreview} alt="Receipt" className="w-full rounded-xl object-cover max-h-40" />
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Fuel Entry</p>
              <button onClick={() => { setShowForm(false); setScanPreview(null) }} className="text-gray-400 text-xl">x</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">Gallons</label>
                <input type="number" step="0.001" value={form.gallons} onChange={e => setForm({...form, gallons: e.target.value})}
                  placeholder="150.000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">$/Gallon</label>
                <input type="number" step="0.001" value={form.price_per_gallon} onChange={e => setForm({...form, price_per_gallon: e.target.value})}
                  placeholder="3.899" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
              </div>
            </div>
            {form.gallons && form.price_per_gallon && (
              <div className="bg-[#E8F5F0] rounded-xl px-4 py-2 flex justify-between items-center">
                <span className="text-sm text-[#2D7A5F] font-medium">Total Cost</span>
                <span className="text-lg font-black text-[#2D7A5F]">
                  ${(parseFloat(form.gallons||0) * parseFloat(form.price_per_gallon||0)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">State</label>
                <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm bg-white">
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">City</label>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                  placeholder="Odessa" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">Odometer</label>
                <input type="number" value={form.odometer} onChange={e => setForm({...form, odometer: e.target.value})}
                  placeholder="125000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase">Notes / Station</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Loves Travel Stop - diesel"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#2D7A5F] text-sm" />
            </div>
            <button onClick={handleSave} disabled={saving || !form.gallons || !form.price_per_gallon}
              className="w-full py-4 bg-[#2D7A5F] text-white rounded-2xl font-bold disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Fuel Log'}
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-2">
            <p className="font-bold text-gray-700 text-sm px-1">Recent Stops</p>
            {logs.map(l => (
              <div key={l.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                <span className="text-xl">⛽</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">
                    {l.city ? l.city + ', ' : ''}{l.state || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400">{l.date} · {(l.gallons||0).toFixed(0)} gal · ${(l.price_per_gallon||0).toFixed(3)}/gal</p>
                </div>
                <p className="font-bold text-gray-800">${(l.total_cost||0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
        {logs.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">⛽</p>
            <p className="font-medium">No fuel logs yet</p>
            <p className="text-sm mt-1">Scan a receipt or tap Manual Entry</p>
          </div>
        )}
      </div>
    </div>
  )
}
