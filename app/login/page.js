'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [admins, setAdmins] = useState([])
  const [selectedAdmin, setSelectedAdmin] = useState(null)

  useEffect(() => {
    if (mode === 'admin') fetch('/api/admin/auth').then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : []))
  }, [mode])

  async function handleDriverLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/driver')
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'Invalid PIN'); setLoading(false); return }
      localStorage.setItem('admin_auth', 'true')
      localStorage.setItem('admin_name', data.admin.name)
      localStorage.setItem('admin_role', data.admin.role)
      router.replace('/admin')
    } catch { setError('Connection error'); setLoading(false) }
  }

  const bg = { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #080d1a 0%, #0d2137 45%, #091f15 100%)', position: 'relative', overflow: 'hidden' }
  const glow = (top, left, size) => ({ position: 'absolute', width: size, height: size, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,122,95,0.15) 0%, transparent 70%)', top, left, pointerEvents: 'none' })
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '15px 16px', color: 'white', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box' }

  if (!mode) return (
    <div style={bg}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(45,122,95,0.3)}50%{box-shadow:0 0 60px rgba(45,122,95,0.6)}} .a1{animation:fadeUp .5s ease both}.a2{animation:fadeUp .5s .1s ease both}.a3{animation:fadeUp .5s .2s ease both}.a4{animation:fadeUp .5s .3s ease both}.btn:active{transform:scale(0.97)}`}</style>
      <div style={glow('5%', '60%', '400px')} />
      <div style={glow('50%', '-10%', '300px')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div className="a1" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '28px', background: 'linear-gradient(135deg, #2D7A5F, #1a4d3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', margin: '0 auto 20px', animation: 'float 3s ease-in-out infinite, glow 3s ease infinite' }}>🚛</div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', letterSpacing: '-1px', margin: '0 0 6px' }}>Smith's Freight Hub</h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Fleet Management Platform</p>
          </div>
          <div className="a2" style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '44px' }}>
            {[['15','APIs'],['33','Pages'],['100%','Live']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ color: '#2D7A5F', fontSize: '20px', fontWeight: '900' }}>{v}</div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px' }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="a3" style={{ marginBottom: '12px' }}>
            <button className="btn" onClick={() => setMode('driver')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,122,95,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform .1s' }}>
              🚛 &nbsp; Driver Login
            </button>
          </div>
          <div className="a4">
            <button className="btn" onClick={() => setMode('admin')} style={{ width: '100%', padding: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,122,95,0.4)', borderRadius: '18px', color: 'rgba(255,255,255,0.75)', fontSize: '16px', fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform .1s' }}>
              ⚙️ &nbsp; Admin Login
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255,255,255,0.12)', fontSize: '10px', letterSpacing: '2px' }}>SECURED · v2.0</p>
        </div>
      </div>
    </div>
  )

  const isDriver = mode === 'driver'
  return (
    <div style={bg}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} .fade{animation:fadeUp .4s ease both} input:focus{border-color:rgba(45,122,95,0.8)!important;background:rgba(45,122,95,0.08)!important} .acard{transition:all .2s;cursor:pointer} .acard:active{transform:scale(0.98)} .btn:active{transform:scale(0.97)}`}</style>
      <div style={glow('20%', '30%', '400px')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1 }}>
        <div className="fade" style={{ width: '100%', maxWidth: '340px' }}>
          <button onClick={() => { setMode(null); setError(''); setPin(''); setSelectedAdmin(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '14px', cursor: 'pointer', marginBottom: '28px', padding: 0 }}>← Back</button>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', marginBottom: '16px', boxShadow: '0 0 28px rgba(45,122,95,0.4)' }}>{isDriver ? '🚛' : '⚙️'}</div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{isDriver ? 'Driver Access' : 'Admin Access'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>{isDriver ? 'Sign in to your account' : `${admins.length} admin${admins.length !== 1 ? 's' : ''} registered`}</p>
          </div>

          {!isDriver && admins.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Select Admin</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {admins.map(a => (
                  <button key={a.id} className="acard" onClick={() => setSelectedAdmin(a)} style={{ padding: '13px 16px', borderRadius: '14px', background: selectedAdmin?.id === a.id ? 'rgba(45,122,95,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selectedAdmin?.id === a.id ? 'rgba(45,122,95,0.6)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textAlign: 'left' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: selectedAdmin?.id === a.id ? '#2D7A5F' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>{a.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{a.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'capitalize' }}>{a.role?.replace('_',' ')}</div>
                    </div>
                    {selectedAdmin?.id === a.id && <span style={{ color: '#2D7A5F', fontSize: '16px' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '22px', padding: '22px' }}>
            <form onSubmit={isDriver ? handleDriverLogin : handleAdminLogin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isDriver && <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />}
                <input type="password" placeholder={isDriver ? 'Password' : selectedAdmin ? `PIN for ${selectedAdmin.name}` : 'Select admin above'} value={isDriver ? password : pin} onChange={e => isDriver ? setPassword(e.target.value) : setPin(e.target.value)} disabled={!isDriver && !selectedAdmin && admins.length > 0} required style={{ ...inputStyle, opacity: !isDriver && !selectedAdmin && admins.length > 0 ? 0.4 : 1 }} />
                {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>⚠️ {error}</div>}
                <button type="submit" className="btn" disabled={loading || (!isDriver && !selectedAdmin && admins.length > 0)} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,122,95,0.35)', opacity: (!isDriver && !selectedAdmin && admins.length > 0) ? 0.4 : 1, transition: 'transform .1s' }}>
                  {loading ? '⏳ Verifying...' : isDriver ? '→ Enter Dashboard' : `→ Enter as ${selectedAdmin?.name || 'Admin'}`}
                </button>
              </div>
            </form>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.12)', fontSize: '10px', letterSpacing: '2px' }}>SMITH'S FREIGHT HUB · SECURED</p>
        </div>
      </div>
    </div>
  )
}
