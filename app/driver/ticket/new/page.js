'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewTicket() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1) // multi-step form
  const [showTruckModal, setShowTruckModal] = useState(false)
  const [form, setForm] = useState({
    customer_name: '',
    load_id: '',
    bol_number: '',
    date: new Date().toISOString().split('T')[0],
    truck_number: '',
    trailer_number: '',
    location_loaded: '',
    po_number: '',
    sand_type: '',
    arrival_time: '',
    departed_time: '',
    boxes: [{ box: '', weight: '' }],
    notes: '',
  })

  useEffect(() => {
    loadDriver()
    loadCustomers()
  }, [])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    const data = await fetch(`/api/drivers?auth_id=${user.id}`).then(r=>r.json())
    setDriver(data)
    if (data) {
      setForm(f => ({ ...f, truck_number: data.truck_number || '', trailer_number: data.trailer_number || '' }))
      if (!data.truck_number) setShowTruckModal(true)
    }
  }

  async function loadCustomers() {
    const [c, l] = await Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ])
    setCustomers(Array.isArray(c) ? c : [])
    setLocations(Array.isArray(l) ? l : [])
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function addBox() {
    setForm(f => ({ ...f, boxes: [...f.boxes, { box: '', weight: '' }] }))
  }

  function removeBox(i) {
    setForm(f => ({ ...f, boxes: f.boxes.filter((_, idx) => idx !== i) }))
  }

  function setBox(i, field, value) {
    setForm(f => {
      const boxes = [...f.boxes]
      boxes[i] = { ...boxes[i], [field]: value }
      return { ...f, boxes }
    })
  }

  async function confirmTruck() {
    await fetch(`/api/drivers/${driver.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ truck_number: form.truck_number, trailer_number: form.trailer_number }),
    })
    setShowTruckModal(false)
  }

  async function handleSave(submitStatus = 'started') {
    setSaving(true)
    const payload = {
      ...form,
      status: submitStatus,
      synced: true,
    }

    const isOnline = navigator.onLine
    if (!isOnline) {
      const offline = JSON.parse(localStorage.getItem('offline_tickets') || '[]')
      offline.push({ ...payload, synced: false, id: crypto.randomUUID() })
      localStorage.setItem('offline_tickets', JSON.stringify(offline))
      router.replace('/driver')
      return
    }

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, auth_id: driver.auth_id }),
    })
    if (!res.ok) {
      const offline = JSON.parse(localStorage.getItem('offline_tickets') || '[]')
      offline.push({ ...payload, synced: false, id: crypto.randomUUID() })
      localStorage.setItem('offline_tickets', JSON.stringify(offline))
    }
    setSaving(false)
    router.replace('/driver')
  }

  const stepOneComplete = form.customer_name && form.date && form.location_loaded
  const stepTwoComplete = form.boxes.every(b => b.box && b.weight)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">✕</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">New Load Ticket</h1>
        <div className="w-6" />
      </div>

      {/* Step indicator */}
      <div className="bg-white px-6 py-3 flex items-center gap-2 border-b">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s ? 'bg-[#2D7A5F] text-white' : 'bg-gray-200 text-gray-400'
            }`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-8 ${step > s ? 'bg-[#2D7A5F]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-400">
          {step === 1 ? 'Load Info' : step === 2 ? 'Loading Details' : 'Review'}
        </span>
      </div>

      <div className="p-4 space-y-4 pb-32">

        {step === 1 && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-700">Load Information</h2>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer</label>
                <input
                  list="customers-list"
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  placeholder="Select or type customer"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-base outline-none focus:border-[#2D7A5F]"
                />
                <datalist id="customers-list">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Load ID</label>
                  <input value={form.load_id} onChange={e => set('load_id', e.target.value)}
                    placeholder="Load ID"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">BOL #</label>
                  <input value={form.bol_number} onChange={e => set('bol_number', e.target.value)}
                    placeholder="BOL Number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Location Loaded</label>
                <input value={form.location_loaded} onChange={e => set('location_loaded', e.target.value)}
                  placeholder="e.g. Odessa TX"
                  list="locations-list"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                <datalist id="locations-list">
                  {locations.map(l => <option key={l.id} value={l.name} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">PO Number</label>
                  <input value={form.po_number} onChange={e => set('po_number', e.target.value)}
                    placeholder="PO #"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sand Type</label>
                  <input value={form.sand_type} onChange={e => set('sand_type', e.target.value)}
                    placeholder="Sand type"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-700">Truck Info</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Truck #</label>
                  <input value={form.truck_number} onChange={e => set('truck_number', e.target.value)}
                    placeholder="Truck number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Trailer #</label>
                  <input value={form.trailer_number} onChange={e => set('trailer_number', e.target.value)}
                    placeholder="Trailer number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-700">Loading Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Arrival Time</label>
                <input type="datetime-local" value={form.arrival_time} onChange={e => set('arrival_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Departed Time</label>
                <input type="datetime-local" value={form.departed_time} onChange={e => set('departed_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Boxes & Weights</label>
                <button onClick={addBox} className="text-[#2D7A5F] text-sm font-semibold">+ Add Box</button>
              </div>
              {form.boxes.map((box, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    value={box.box}
                    onChange={e => setBox(i, 'box', e.target.value)}
                    placeholder="Box #"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-[#2D7A5F]"
                  />
                  <input
                    value={box.weight}
                    onChange={e => setBox(i, 'weight', e.target.value)}
                    placeholder="Weight (ton)"
                    type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-[#2D7A5F]"
                  />
                  {form.boxes.length > 1 && (
                    <button onClick={() => removeBox(i)} className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] resize-none" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-4">Review Ticket</h2>
              {[
                ['Customer', form.customer_name],
                ['Load ID', form.load_id],
                ['BOL Number', form.bol_number],
                ['Date', form.date],
                ['Truck #', form.truck_number],
                ['Trailer #', form.trailer_number],
                ['Location Loaded', form.location_loaded],
                ['PO Number', form.po_number],
                ['Sand Type', form.sand_type],
                ['Arrival Time', form.arrival_time],
                ['Departed Time', form.departed_time],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-medium">{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-3">Boxes</h2>
              {form.boxes.map((box, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 text-sm">Box {box.box}</span>
                  <span className="text-gray-800 text-sm font-medium">{box.weight} ton</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 border-2 border-[#2D7A5F] text-[#2D7A5F] py-4 rounded-2xl font-semibold">
            Back
          </button>
        )}
        {step < 3 && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !stepOneComplete}
            className="flex-1 bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
            Next
          </button>
        )}
        {step === 3 && (
          <>
            <button onClick={() => handleSave('started')} disabled={saving}
              className="flex-1 border-2 border-[#2D7A5F] text-[#2D7A5F] py-4 rounded-2xl font-semibold disabled:opacity-40">
              Save
            </button>
            <button onClick={() => handleSave('submitted')} disabled={saving}
              className="flex-1 bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>

      {/* Confirm Truck Modal */}
      {showTruckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🚛</div>
              <h2 className="text-xl font-bold text-gray-800">Confirm your truck</h2>
              <p className="text-gray-400 text-sm mt-1">Set your truck and trailer numbers to add a record.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Truck number</label>
                <input value={form.truck_number} onChange={e => set('truck_number', e.target.value)}
                  placeholder="e.g. 904"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Trailer number</label>
                <input value={form.trailer_number} onChange={e => set('trailer_number', e.target.value)}
                  placeholder="e.g. 810634"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <button onClick={confirmTruck}
                className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold mt-2">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
