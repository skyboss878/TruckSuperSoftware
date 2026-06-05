'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DriverDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [driver, setDriver] = useState(null)
  const [tickets, setTickets] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [sessionMiles, setSessionMiles] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => { loadDriver() }, [])

  async function loadDriver() {
    const [driverRes, { data: t }, { data: ts }, sessRes] = await Promise.all([
      fetch(`/api/drivers/${id}`).then(r => r.json()),
      fetch(`/api/tickets?driver_id=${id}`).then(r=>r.json()),
      fetch(`/api/timesheets?driver_id=${id}`).then(r=>r.json()),
      fetch(`/api/tracking?driver_id=${id}`).then(r=>r.json()),
    ])
    setDriver(driverRes?.id ? driverRes : null)
    setForm(driverRes?.id ? driverRes : {})
    setTickets(Array.isArray(t) ? t : [])
    setTimesheets(Array.isArray(ts) ? ts : [])
    const sessionMiles = Array.isArray(sessRes)
      ? sessRes.reduce((s, trip) => s + (trip.total_miles || 0), 0)
      : 0
    setSessionMiles(parseFloat(sessionMiles.toFixed(1)))
    setLoading(false)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        license_number: form.license_number,
        truck_number: form.truck_number,
        trailer_number: form.trailer_number,
      }),
    })
    await loadDriver()
    setEditing(false)
    setSaving(false)
  }

  async function toggleStatus() {
    const newStatus = driver.status === 'active' ? 'inactive' : 'active'
    await fetch(`/api/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    await loadDriver()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const timeSheetMiles = timesheets.reduce((sum, ts) =>
    sum + (ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0), 0)
  const totalMiles = parseFloat((timeSheetMiles + sessionMiles).toFixed(1))

  const statusColor = {
    started: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  if (!driver) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Driver Profile</h1>
        <button onClick={() => setEditing(!editing)}
          className="text-[#2D7A5F] font-medium text-sm">
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Profile header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {driver.name?.[0]}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{driver.name}</h2>
          <p className="text-gray-400 text-sm">{driver.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
            driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {driver.status === 'active' ? '● Active' : '○ Inactive'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Tickets', value: tickets.length },
            { label: 'Approved', value: tickets.filter(t => t.status === 'approved').length },
            { label: 'Total Miles', value: totalMiles.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Info / Edit form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-700">Driver Info</h3>
          {editing ? (
            <div className="space-y-3">
              {[
                { field: 'name', label: 'Full Name' },
                { field: 'phone', label: 'Phone' },
                { field: 'license_number', label: 'CDL License #' },
                { field: 'truck_number', label: 'Truck #' },
                { field: 'trailer_number', label: 'Trailer #' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</label>
                  <input
                    value={form[field] || ''}
                    onChange={e => set(field, e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]"
                  />
                </div>
              ))}
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-[#2D7A5F] text-white py-3 rounded-xl font-semibold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            [
              ['Phone', driver.phone],
              ['CDL License', driver.license_number],
              ['Truck #', driver.truck_number],
              ['Trailer #', driver.trailer_number],
              ['Member Since', new Date(driver.created_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-gray-800 text-sm font-medium">{value || '—'}</span>
              </div>
            ))
          )}
        </div>

        {/* Recent tickets */}
        {tickets.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">Recent Tickets</h3>
            {tickets.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t.customer_name || '—'}</p>
                  <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[t.status]}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activate / Deactivate */}
        <button
          onClick={toggleStatus}
          className={`w-full py-4 rounded-2xl font-semibold text-base border-2 ${
            driver.status === 'active'
              ? 'border-red-300 text-red-500 bg-red-50'
              : 'border-[#2D7A5F] text-[#2D7A5F] bg-[#E8F5F0]'
          }`}>
          {driver.status === 'active' ? '⏸ Deactivate Driver' : '▶ Activate Driver'}
        </button>

        <p className="text-center text-xs text-gray-300 px-4">
          Deactivated drivers cannot log in but all their records are permanently kept for audit purposes.
        </p>
      </div>
    </div>
  )
}
