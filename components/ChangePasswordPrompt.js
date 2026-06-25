'use client'
import { useState } from 'react'
import { authFetch } from '@/lib/api-client'

export default function ChangePasswordPrompt({ driverName, onComplete }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError('')
    try {
      const res = await authFetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to update password'); setSaving(false); return }
      onComplete()
    } catch {
      setError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 },
    input: { width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
    label: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', fontWeight: 600 },
    btn: { width: '100%', padding: 16, background: 'linear-gradient(135deg,#2D7A5F,#1a5c44)', border: 'none', borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  }

  return (
    <div style={S.page}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>Set Your Password</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Welcome, {driverName}! Create a personal password to secure your account.
        </p>
      </div>

      <div style={S.card}>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 characters" style={S.input} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password" style={S.input} />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : '🔐 Set My Password'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 20, textAlign: 'center' }}>
        You only need to do this once. Your password is encrypted and never shared.
      </p>
    </div>
  )
}
