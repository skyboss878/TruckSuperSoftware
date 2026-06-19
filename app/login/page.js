'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: Math.random() * 2 + 1,
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(45,122,95,0.5)'; ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    try {
      const res = await fetch(`/api/me?user_id=${authData.user.id}`)
      const me = await res.json()

      if (!me.company) {
        setError('No company account found. Please sign up first.')
        setLoading(false)
        return
      }

      localStorage.setItem('company_id', me.company.id)
      localStorage.setItem('company_name', me.company.name)
      localStorage.setItem('user_role', me.role)
      localStorage.setItem('user_name', me.name || authData.user.email)

      if (['owner', 'admin', 'dispatcher'].includes(me.role)) {
        router.replace('/admin')
      } else {
        router.replace('/driver')
      }
    } catch {
      setError('Could not load account. Try again.')
      setLoading(false)
    }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '15px 16px', color: 'white', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b16 0%, #0a1f2e 50%, #071510 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 4px', letterSpacing: -0.5 }}>TruckSuperSoftware</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Sign in to your fleet dashboard</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, backdropFilter: 'blur(20px)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', fontWeight: 600 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', fontWeight: 600 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} required />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : '🚛 Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
          New carrier? <a href="/signup" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>Start your free trial →</a>
        </p>
      </div>
    </div>
  )
}
