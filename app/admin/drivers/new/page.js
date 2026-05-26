'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getPasswordStrength(p) {
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const levels = [
    { label: 'Too short', color: 'bg-red-400' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-yellow-400' },
    { label: 'Good', color: 'bg-blue-400' },
    { label: 'Strong', color: 'bg-green-500' },
  ]
  return { score, ...levels[score] }
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function NewDriver() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [touched, setTouched] = useState({})
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    license_number: '', truck_number: '',
    trailer_number: '', password: '', confirm_password: '',
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setTouched(t => ({ ...t, [field]: true }))
  }

  function fieldError(field) {
    if (!touched[field]) return ''
    if (field === 'name' && !form.name) return 'Full name is required'
    if (field === 'email') {
      if (!form.email) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email'
    }
    if (field === 'password') {
      if (!form.password) return 'Password is required'
      if (form.password.length < 8) return 'Minimum 8 characters'
    }
    if (field === 'confirm_password') {
      if (form.confirm_password !== form.password) return 'Passwords do not match'
    }
    return ''
  }

  function handleGenerate() {
    const pwd = generatePassword()
    setForm(f => ({ ...f, password: pwd, confirm_password: pwd }))
    setTouched(t => ({ ...t, password: true, confirm_password: true }))
    setShowPassword(true)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(form.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    const allTouched = Object.fromEntries(
      Object.keys(form).map(k => [k, true])
    )
    setTouched(allTouched)

    const hasErrors = ['name', 'email', 'password', 'confirm_password'].some(f => fieldError(f) || !form[f])
    if (form.password !== form.confirm_password) return setError('Passwords do not match')
    if (hasErrors) return setError('Please fix the errors above')

    const strength = getPasswordStrength(form.password)
    if (strength.score < 2) return setError('Please choose a stronger password')

    setSaving(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    const auth_id = authData?.user?.id

    const { error: dbError } = await supabase.from('drivers').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      license_number: form.license_number,
      truck_number: form.truck_number,
      trailer_number: form.trailer_number,
      auth_id,
      status: 'active',
    })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.replace('/admin'), 2000)
  }

  const strength = getPasswordStrength(form.password)

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-4xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Driver Created!</h2>
        <p className="text-gray-500 text-center">
          {form.name} has been added successfully. Redirecting...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Add Driver</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-32">

        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Personal Info</h2>
          {[
            { field: 'name', label: 'Full Name', placeholder: 'Driver full name', type: 'text' },
            { field: 'email', label: 'Email', placeholder: 'driver@example.com', type: 'email' },
            { field: 'license_number', label: 'CDL License #', placeholder: 'License number', type: 'text' },
          ].map(({ field, label, placeholder, type }) => (
            <div key={field}>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                className={`w-full border rounded-xl px-4 py-3 mt-1 outline-none transition-colors ${
                  fieldError(field) ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#2D7A5F]'
                }`}
              />
              {fieldError(field) && (
                <p className="text-red-500 text-xs mt-1">{fieldError(field)}</p>
              )}
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', formatPhone(e.target.value))}
              placeholder="(555) 555-5555"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]"
            />
          </div>
        </div>

        {/* Truck Assignment */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Truck Assignment</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { field: 'truck_number', label: 'Truck #', placeholder: 'e.g. 12' },
              { field: 'trailer_number', label: 'Trailer #', placeholder: 'e.g. 55' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</label>
                <input
                  value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Login Credentials */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Login Credentials</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-yellow-700 text-sm">⚠️ Share these credentials with the driver securely. They use these to log in.</p>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full border-2 border-dashed border-[#2D7A5F] text-[#2D7A5F] py-3 rounded-xl font-semibold text-sm"
          >
            ⚡ Auto-Generate Secure Password
          </button>

          {/* Password */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min 8 characters"
                className={`w-full border rounded-xl px-4 py-3 pr-12 outline-none transition-colors ${
                  fieldError('password') ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#2D7A5F]'
                }`}
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldError('password') && <p className="text-red-500 text-xs mt-1">{fieldError('password')}</p>}

            {/* Strength meter */}
            {form.password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={e => set('confirm_password', e.target.value)}
              placeholder="Re-enter password"
              className={`w-full border rounded-xl px-4 py-3 mt-1 outline-none transition-colors ${
                fieldError('confirm_password') ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#2D7A5F]'
              }`}
            />
            {fieldError('confirm_password') && (
              <p className="text-red-500 text-xs mt-1">{fieldError('confirm_password')}</p>
            )}
          </div>

          {/* Copy button */}
          {form.password && form.password === form.confirm_password && (
            <button
              onClick={handleCopy}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-sm"
            >
              {copied ? '✅ Copied to Clipboard!' : '📋 Copy Password'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Creating Driver...' : 'Create Driver'}
        </button>
      </div>
    </div>
  )
}
