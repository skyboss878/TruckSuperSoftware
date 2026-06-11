'use client'
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
    const d = await fetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
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
      const mediaType = file.type || 'image/jpeg'
      const response = await fetch('/api/fuel-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, media_type: mediaType }),
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
        notes: d.station_name ? `${d.station_name}${d.fuel_type ? ` · ${d.fuel_type}` : ''}` : prev.notes,
        odometer: d.odometer?.toString() || prev.odometer,
      }))
      showToast('✅ Receipt scanned — review and confirm')
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
    await fetch('/api/fuel', {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 animate-pulse">Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Fuel Log</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Stats */}
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

        {/* AI Scan CTA */}
        {!showForm && (
          <div className="bg-gradient-to-br from-[#1a3a2a] to-[#0d2419] rounded-2xl p-5 text-white border border-[#2D7A5F]/30">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="font-bold text-base">AI Receipt Scanner</p>
                <p className="text-green-300 text-xs">Snap your receipt — AI fills in everything</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files[0] && scanReceipt(e.target.files[0])} />
            <div className="grid grid-cols-2 gap-3">
}