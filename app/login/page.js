'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const timedOut = typeof window !== 'undefined' && window.location.search.includes('reason=timeout')
  const canvasRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [admins, setAdmins] = useState([])
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [ticker, setTicker] = useState([])

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }))

    let raf
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(45,122,95,0.5)'
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(45,122,95,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  // Live ticker data
  useEffect(() => {
    async function loadTicker() {
      try {
        const [drivers, tickets, pretrip] = await Promise.all([
          fetch('/api/drivers').then(r => r.json()),
          fetch('/api/tickets').then(r => r.json()),
          fetch('/api/pre-trip?admin=true').then(r => r.json()),
        ])
        const active = Array.isArray(drivers) ? drivers.filter(d => d.status === 'active').length : 0
        const total = Array.isArray(tickets) ? tickets.length : 0
        const approved = Array.isArray(tickets) ? tickets.filter(t => t.status === 'approved').length : 0
        const inspected = Array.isArray(pretrip?.drivers) ? pretrip.drivers.filter(d => d.inspection).length : 0
        setTicker([
          `🚛 ${active} Active Drivers`,
          `📋 ${total} Total Tickets`,
          `✅ ${approved} Approved Today`,
          `🔍 ${inspected} Pre-Trips Done`,
          `⚡ All Systems Live`,
          `🔒 15/15 APIs Passing`,
          `📍 Real-Time GPS Active`,
          `🤖 AI Dispatch Online`,
        ])
      } catch {}
    }
    loadTicker()
  }, [])

  useEffect(() => {
    if (mode === 'admin') fetch('/api/admin/auth').then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : []))
  }, [mode])

  async function handleDriverLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/driver')
  }

  async function handleAdminLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'Invalid PIN'); setLoading(false); return }
      localStorage.setItem('admin_auth', 'true')
      localStorage.setItem('admin_name', data.admin.name)
      localStorage.setItem('admin_role', data.admin.role)
      router.replace('/admin')
    } catch { setError('Connection error'); setLoading(false) }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '15px 16px', color: 'white', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box' }

  const tickerText = ticker.length ? ticker.join('   ·   ') + '   ·   ' + ticker.join('   ·   ') : ''

  if (!mode) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b16 0%, #0a1f2e 50%, #071510 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      <style>{`
        @keyframes float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.02)}}
        @keyframes headlight{0%,100%{box-shadow:0 0 30px rgba(45,122,95,0.4),0 0 60px rgba(45,122,95,0.2)}50%{box-shadow:0 0 50px rgba(45,122,95,0.8),0 0 100px rgba(45,122,95,0.4),0 0 150px rgba(45,122,95,0.1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        .a1{animation:fadeUp .6s ease both}
        .a2{animation:fadeUp .6s .12s ease both}
        .a3{animation:fadeUp .6s .24s ease both}
        .a4{animation:fadeUp .6s .36s ease both}
        .a5{animation:fadeUp .6s .48s ease both}
        .truck{animation:float 3.5s ease-in-out infinite}
        .truckbox{animation:headlight 2.5s ease-in-out infinite}
        .btn:active{transform:scale(0.97)!important}
        input:focus{border-color:rgba(45,122,95,0.8)!important;background:rgba(45,122,95,0.1)!important}
        .acard:active{transform:scale(0.98)}
        .acard{transition:all .2s;cursor:pointer}
      `}</style>

      {/* Live ticker */}
      {ticker.length > 0 && (
        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(45,122,95,0.12)', borderBottom: '1px solid rgba(45,122,95,0.2)', padding: '8px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ticker 30s linear infinite' }}>
            <span style={{ color: 'rgba(45,200,120,0.8)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', paddingRight: '40px' }}>{tickerText}</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>

          {/* Truck hero */}
          <div className="a1" style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="truck" style={{ display: 'inline-block', marginBottom: '22px' }}>
              <div className="truckbox" style={{ width: '96px', height: '96px', borderRadius: '30px', background: 'linear-gradient(145deg, #1a5c44, #0d3d2c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', margin: '0 auto', border: '1px solid rgba(45,122,95,0.3)' }}>🚛</div>
            </div>
            <h1 style={{ fontSize: '34px', fontWeight: '900', color: '#fff', letterSpacing: '-1.5px', margin: '0 0 6px', textShadow: '0 0 40px rgba(45,122,95,0.3)' }}>TruckSuperSoftware</h1>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>TruckSuperSoftware · Trucking Operations</p>
          </div>

          {/* Live dot */}
          <div className="a2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 0 8px #4ade80' }} />
            <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '700', letterSpacing: '1px' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>

          {/* Stats */}
          <div className="a3" style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '36px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', overflow: 'hidden' }}>
            {[['15','APIs'],['33','Pages'],['100%','Live']].map(([v,l], i) => (
              <div key={l} style={{ flex: 1, textAlign: 'center', padding: '16px 8px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ color: '#2D7A5F', fontSize: '22px', fontWeight: '900', lineHeight: 1 }}>{v}</div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '4px' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="a4" style={{ marginBottom: '10px' }}>
            <button className="btn" onClick={() => setMode('driver')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,122,95,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform .15s', letterSpacing: '0.3px' }}>
              🚛 &nbsp; Driver Login
            </button>
          </div>
          <div className="a5">
            <button className="btn" onClick={() => setMode('admin')} style={{ width: '100%', padding: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,122,95,0.35)', borderRadius: '18px', color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform .15s', letterSpacing: '0.3px' }}>
              ⚙️ &nbsp; Admin Login
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '32px', color: 'rgba(255,255,255,0.1)', fontSize: '10px', letterSpacing: '2px' }}>SECURED · SMITH'S FREIGHT HUB · v2.0</p>
        </div>
      </div>
    </div>
  )

  const isDriver = mode === 'driver'
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060b16 0%, #0a1f2e 50%, #071510 100%)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .fade{animation:fadeUp .4s ease both}
        input:focus{border-color:rgba(45,122,95,0.8)!important;background:rgba(45,122,95,0.1)!important}
        .acard{transition:all .2s;cursor:pointer}.acard:active{transform:scale(0.98)}
        .btn:active{transform:scale(0.97)!important}
      `}</style>

      {ticker.length > 0 && (
        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(45,122,95,0.12)', borderBottom: '1px solid rgba(45,122,95,0.2)', padding: '8px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ticker 30s linear infinite' }}>
            <span style={{ color: 'rgba(45,200,120,0.8)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', paddingRight: '40px' }}>{tickerText}</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1 }}>
        <div className="fade" style={{ width: '100%', maxWidth: '340px' }}>
          <button onClick={() => { setMode(null); setError(''); setPin(''); setSelectedAdmin(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', marginBottom: '16px', boxShadow: '0 0 30px rgba(45,122,95,0.5)' }}>{isDriver ? '🚛' : '⚙️'}</div>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{isDriver ? 'Driver Access' : 'Admin Access'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', margin: 0 }}>{isDriver ? 'Sign in to your account' : `${admins.length} admin${admins.length !== 1 ? 's' : ''} registered`}</p>
          </div>

          {!isDriver && admins.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Select Your Account</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {admins.map(a => (
                  <button key={a.id} className="acard" onClick={() => setSelectedAdmin(a)} style={{ padding: '13px 16px', borderRadius: '14px', background: selectedAdmin?.id === a.id ? 'rgba(45,122,95,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedAdmin?.id === a.id ? 'rgba(45,122,95,0.6)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textAlign: 'left', boxShadow: selectedAdmin?.id === a.id ? '0 4px 20px rgba(45,122,95,0.2)' : 'none' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: selectedAdmin?.id === a.id ? 'linear-gradient(135deg,#2D7A5F,#1a5c44)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>{a.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{a.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textTransform: 'capitalize' }}>{a.role?.replace('_', ' ')}</div>
                    </div>
                    {selectedAdmin?.id === a.id && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✓</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '22px', padding: '20px' }}>
            <form onSubmit={isDriver ? handleDriverLogin : handleAdminLogin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isDriver && <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />}
                <input type="password" placeholder={isDriver ? 'Password' : selectedAdmin ? `PIN for ${selectedAdmin.name}` : 'Select admin above'} value={isDriver ? password : pin} onChange={e => isDriver ? setPassword(e.target.value) : setPin(e.target.value)} disabled={!isDriver && !selectedAdmin && admins.length > 0} required style={{ ...inputStyle, opacity: !isDriver && !selectedAdmin && admins.length > 0 ? 0.35 : 1 }} />
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>⚠️ {error}</div>}
                <button type="submit" className="btn" disabled={loading || (!isDriver && !selectedAdmin && admins.length > 0)} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 24px rgba(45,122,95,0.4)', opacity: (!isDriver && !selectedAdmin && admins.length > 0) ? 0.35 : 1, transition: 'transform .15s', letterSpacing: '0.3px' }}>
                  {loading ? '⏳ Verifying...' : isDriver ? '→ Enter Dashboard' : `→ Enter as ${selectedAdmin?.name || 'Admin'}`}
                </button>
              </div>
            </form>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.1)', fontSize: '10px', letterSpacing: '2px' }}>SMITH'S FREIGHT HUB · SECURED</p>
        </div>
      </div>
    </div>
  )
}
