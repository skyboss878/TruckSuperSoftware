'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState(null) // 'driver' | 'admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDriverLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.replace('/driver')
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN?.trim()) {
      localStorage.setItem('admin_auth', 'true')
      router.replace('/admin')
    } else {
      setError('Incorrect PIN')
      setLoading(false)
    }
  }

  if (!mode) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🚛</div>
          <h1 className="text-2xl font-bold text-gray-800">Smith's Freight Hub</h1>
          <p className="text-gray-500 mt-1">Select your login type</p>
        </div>
        <button
          onClick={() => setMode('driver')}
          className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl text-lg font-semibold mb-4 active:opacity-80"
        >
          Driver Login
        </button>
        <button
          onClick={() => setMode('admin')}
          className="w-full border-2 border-[#2D7A5F] text-[#2D7A5F] py-4 rounded-2xl text-lg font-semibold active:opacity-80"
        >
          Admin Login
        </button>
      </div>
    </div>
  )

  if (mode === 'driver') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode(null)} className="text-[#2D7A5F] mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Driver Login</h2>
        <form onSubmit={handleDriverLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[#2D7A5F]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[#2D7A5F]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl text-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )

  if (mode === 'admin') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode(null)} className="text-[#2D7A5F] mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Login</h2>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[#2D7A5F]"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl text-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
