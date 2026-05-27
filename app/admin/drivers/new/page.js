'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewDriver() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    license_number: '', truck_number: '',
    trailer_number: '', password: '',
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required')
      return
    }
    setSaving(true)
    setError('')

    try {
      // Sign up the driver
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: null }
      })

      if (authError) {
        setError(authError.message)
        setSaving(false)
        return
      }

      const auth_id = authData?.user?.id

      // Insert driver record
      const { error: dbError } = await supabase.from('drivers').insert({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        license_number: form.license_number || null,
        truck_number: form.truck_number || null,
        trailer_number: form.trailer_number || null,
        auth_id,
        status: 'active',
        language: 'en',
      })

      if (dbError) {
        setError(dbError.message)
        setSaving(false)
        return
      }

      router.replace('/admin')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Add Driver</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-32">
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

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Login Credentials</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-yellow-700 text-sm">⚠️ Share these credentials with the driver securely.</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Password</label>
            <input type="text" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Set a temporary password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
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
          {saving ? 'Creating Driver...' : 'Create Driver'}
        </button>
      </div>
    </div>
  )
}
