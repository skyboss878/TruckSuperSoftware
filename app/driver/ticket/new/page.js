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
  const [photos, setPhotos] = useState([])
  const [step, setStep] = useState(1) // multi-step form
  const [showTruckModal, setShowTruckModal] = useState(false)
  const [showPreTrip, setShowPreTrip] = useState(false)
  const [pretripChecks, setPretripChecks] = useState({})
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
    setShowPreTrip(true)
  }

  function toggleCheck(key) {
    setPretripChecks(c => ({ ...c, [key]: !c[key] }))
  }

  const PRETRIP_ITEMS = [
    { key: 'lights', label: 'Lights (head, tail, brake, turn)' },
    { key: 'tires', label: 'Tires — no flats or damage' },
    { key: 'brakes', label: 'Brakes operational' },
    { key: 'mirrors', label: 'Mirrors clean and adjusted' },
    { key: 'horn', label: 'Horn working' },
    { key: 'wipers', label: 'Wipers functional' },
    { key: 'fuel', label: 'Fuel level checked' },
    { key: 'fluids', label: 'Oil & coolant levels OK' },
    { key: 'cargo', label: 'Cargo area secure and clean' },
    { key: 'docs', label: 'License, registration & insurance' },
  ]

  const allChecked = PRETRIP_ITEMS.every(i => pretripChecks[i.key])

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
    let ticketId = null
    if (!res.ok) {
      const offline = JSON.parse(localStorage.getItem('offline_tickets') || '[]')
      offline.push({ ...payload, synced: false, id: crypto.randomUUID() })
      localStorage.setItem('offline_tickets', JSON.stringify(offline))
    } else {
      const ticketData = await res.json()
      ticketId = ticketData?.id
    }

    // Upload photos if any
    if (photos.length > 0 && ticketId) {
      for (const photo of photos) {
        try {
          const formData = new FormData()
          formData.append('file', photo.file)
          formData.append('ticket_id', ticketId)
          formData.append('type', 'photo')
          formData.append('caption', photo.caption || '')
          await fetch('/api/upload', { method: 'POST', body: formData })
        } catch (e) { console.error('Photo upload failed:', e) }
      }
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
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s ? 'bg-[#2D7A5F] text-white' : 'bg-gray-200 text-gray-400'
            }`}>{s}</div>
            {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-[#2D7A5F]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-400">
          {step === 1 ? 'Load Info' : step === 2 ? 'Loading Details' : step === 3 ? 'Photos' : 'Review'}
        </span>
      </div>

      <div className="p-4 space-y-4 pb-32">

        {step === 1 && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-700">Load Information</h2>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer</label>
                <select
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-base outline-none focus:border-[#2D7A5F] bg-white">
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
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
                <select
                  value={form.location_loaded}
                  onChange={e => set('location_loaded', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] bg-white">
                  <option value="">-- Select Location --</option>
                  {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
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
              <h2 className="font-bold text-gray-700 mb-2">📸 Photos</h2>
              <p className="text-xs text-gray-400 mb-4">Add photos of the load, BOL, or delivery location (optional)</p>

              <label className="block w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer active:opacity-70">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files)
                    const previews = files.map(f => ({ file: f, url: URL.createObjectURL(f), caption: '' }))
                    setPhotos(prev => [...prev, ...previews])
                  }}
                />
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-medium text-gray-600">Tap to take photo or choose from gallery</p>
                <p className="text-xs text-gray-400 mt-1">Multiple photos allowed</p>
              </label>

              {photos.length > 0 && (
                <div className="mt-4 space-y-3">
                  {photos.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                      <img src={p.url} alt="preview" className="w-16 h-16 object-cover rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Caption (optional)"
                          value={p.caption}
                          onChange={e => {
                            const updated = [...photos]
                            updated[i].caption = e.target.value
                            setPhotos(updated)
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D7A5F]"
                        />
                      </div>
                      <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                        className="text-red-400 text-lg shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
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
        {step < 4 && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !stepOneComplete}
            className="flex-1 bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
            Next
          </button>
        )}
        {step === 4 && (
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
      {showPreTrip && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="bg-white rounded-t-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-xl font-bold text-gray-800">Pre-Trip Inspection</h2>
              <p className="text-gray-400 text-sm mt-1">Check each item before starting your load.</p>
            </div>
            <div className="space-y-2 mb-5">
              {PRETRIP_ITEMS.map(item => (
                <button key={item.key} onClick={() => toggleCheck(item.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                    pretripChecks[item.key] ? 'border-[#2D7A5F] bg-green-50' : 'border-gray-200 bg-white'
                  }`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    pretripChecks[item.key] ? 'border-[#2D7A5F] bg-[#2D7A5F]' : 'border-gray-300'
                  }`}>
                    {pretripChecks[item.key] && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="text-center text-xs text-gray-400 mb-3">
              {Object.values(pretripChecks).filter(Boolean).length}/{PRETRIP_ITEMS.length} items checked
            </div>
            <button onClick={() => setShowPreTrip(false)} disabled={!allChecked}
              className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-40">
              {allChecked ? '✅ Start Ticket' : `Check all ${PRETRIP_ITEMS.length} items to continue`}
            </button>
          </div>
        </div>
      )}

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
