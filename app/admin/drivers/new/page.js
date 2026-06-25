'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api-client'

export default function NewDriver() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    license_number: '', truck_number: '', trailer_number: '',
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')

    try {
      const res = await authFetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to create driver')
        setSaving(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.replace('/admin'), 4000)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>Driver Created!</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>A welcome email with login credentials has been sent to</p>
      <p style={{ fontSize: 15, color: '#4ade80', fontWeight: 700 }}>{form.email}</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>Redirecting in a moment...</p>
      <button onClick={() => router.replace('/admin')} style={{ marginTop: 16, padding: '12px 24px', background: '#2D7A5F', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Go to Dashboard →
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Add Driver</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-32">

        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-green-700 text-sm">✉️ A secure password will be auto-generated and emailed to the driver automatically.</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Personal Info</h2>
          {[
            { field: 'name', label: 'Full Name', placeholder: 'Driver full name', type: 'text' },
            { field: 'email', label: 'Email', placeholder: 'driver@example.com', type: 'email' },
            { field: 'phone', label: 'Phone', placeholder: '(555) 555-5555', type: 'tel' },
            { field: 'license_number', label: 'CDL License #', placeholder: 'License number', type: 'text' },
          ].map(({ field, label, placeholder, type }) => (
            <div key={field}>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Truck Assignment</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Truck #</label>
              <input value={form.truck_number} onChange={e => set('truck_number', e.target.value)}
                placeholder="e.g. 904"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Trailer #</label>
              <input value={form.trailer_number} onChange={e => set('trailer_number', e.target.value)}
                placeholder="e.g. 810634"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40">
          {saving ? 'Creating & Sending Email...' : '🚛 Create Driver & Send Welcome Email'}
        </button>
      </div>
    </div>
  )
}
