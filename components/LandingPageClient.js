'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect } from 'react'

const features = [
  { icon: '📍', title: 'Live Fleet Map', desc: 'Real-time GPS tracking with offline cache and auto-zoom' },
  { icon: '✅', title: 'DOT Pre-Trip', desc: 'Mandatory safety inspections enforced on every login' },
  { icon: '⏱️', title: 'HOS Logging', desc: '11hr drive clock, 14hr window, 70hr weekly limit' },
  { icon: '✍️', title: 'Digital POD', desc: 'Customer signatures captured on delivery, paperless' },
  { icon: '⛽', title: 'IFTA Reports', desc: 'Automatic quarterly fuel tax by state with CSV export' },
  { icon: '🤖', title: 'AI Dispatch', desc: 'Ask questions, approve tickets, message drivers by voice' },
  { icon: '📊', title: 'Scorecards', desc: 'A-F safety grades based on HOS, defects, and miles' },
  { icon: '🔔', title: 'Push Alerts', desc: 'Drivers notified instantly on messages and approvals' },
]

// stats loaded dynamically

export default function LandingPage() {
  const router = useRouter()
  const [sysStatus, setSysStatus] = useState('operational')
  const [liveStats, setLiveStats] = useState([
    { value: '29', label: 'Live APIs' },
    { value: '38', label: 'Pages' },
    { value: '100%', label: 'Uptime' },
    { value: 'Live', label: 'Data' },
  ])

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        const ok = Object.values(d.checks || {}).filter(v => v === 'ok').length
        const total = Object.values(d.checks || {}).length
        const pct = total > 0 ? Math.round((ok / total) * 100) : 100
        setSysStatus(d.status === 'healthy' ? 'operational' : 'degraded')
        setLiveStats([
          { value: '29', label: 'Live APIs' },
          { value: '38', label: 'Pages' },
          { value: pct + '%', label: 'Uptime' },
          { value: d.response_ms < 1000 ? 'Fast' : 'Live', label: 'Response' },
        ])
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #080d1a 0%, #0d2137 45%, #091f15 100%)', overflowX: 'hidden' }}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideRight { from{transform:translateX(-100%)} to{transform:translateX(100vw)} }
        .a1{animation:fadeUp .7s ease forwards}
        .a2{animation:fadeUp .7s ease .15s both}
        .a3{animation:fadeUp .7s ease .3s both}
        .a4{animation:fadeUp .7s ease .45s both}
        .a5{animation:fadeUp .7s ease .6s both}
        .float{animation:float 4s ease-in-out infinite}
        .btn:active{transform:scale(0.97)!important}
        .feature-card:hover{border-color:rgba(45,122,95,0.5)!important;transform:translateY(-4px);background:rgba(45,122,95,0.08)!important}
        .feature-card{transition:all .3s ease}
      `}</style>

      {/* Background effects */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,122,95,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,122,95,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,33,55,0.6) 0%, transparent 70%)' }} />
        {/* Moving road line */}
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: `${15 + i * 8}%`, height: '1px', width: '200px',
            background: 'linear-gradient(90deg, transparent, rgba(45,122,95,0.4), transparent)',
            animation: `slideRight ${4 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2D7A5F, #1a4d3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 16px rgba(45,122,95,0.4)' }}>🚛</div>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '16px', letterSpacing: '-0.3px' }}>Smith's Freight Hub</span>
          </div>
          <button onClick={() => router.push('/login')} className="btn" style={{
            padding: '10px 20px', borderRadius: '12px',
            background: 'rgba(45,122,95,0.2)', border: '1px solid rgba(45,122,95,0.4)',
            color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'all .2s',
          }}>Sign In →</button>
        </nav>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '40px 24px 60px', maxWidth: '600px', margin: '0 auto' }}>

          <div className="a1 float" style={{ fontSize: '80px', marginBottom: '24px', display: 'block', filter: 'drop-shadow(0 0 30px rgba(45,122,95,0.5))' }}>🚛</div>

          <div className="a2" style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '20px', marginBottom: '20px',
            background: 'rgba(45,122,95,0.15)', border: '1px solid rgba(45,122,95,0.3)',
            color: '#4ade80', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            ● Live Platform
          </div>

          <h1 className="a3" style={{
            fontSize: '42px', fontWeight: '900', color: '#ffffff',
            lineHeight: 1.1, letterSpacing: '-1.5px', margin: '0 0 16px',
          }}>
            The Future of<br />
            <span style={{ background: 'linear-gradient(135deg, #2D7A5F, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fleet Management
            </span>
          </h1>

          <p className="a4" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', lineHeight: 1.6, margin: '0 0 36px' }}>
            Real-time GPS tracking, DOT compliance, AI dispatch, digital POD, and HOS logging — all in one platform built for modern trucking operations.
          </p>

          <div className="a5" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login')} className="btn" style={{
              padding: '16px 32px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)',
              border: 'none', color: 'white', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,122,95,0.4)',
              transition: 'transform .1s',
            }}>🚛 Driver Login</button>
            <button onClick={() => router.push('/login')} className="btn" style={{
              padding: '16px 32px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              transition: 'transform .1s',
            }}>⚙️ Admin Portal</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '0 24px 60px' }}>
          <div style={{
            maxWidth: '500px', margin: '0 auto',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px', padding: '24px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
            backdropFilter: 'blur(10px)',
          }}>
            {liveStats.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#2D7A5F', fontSize: '22px', fontWeight: '900', lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '0 20px 80px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ color: 'white', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', margin: '0 0 8px' }}>
              Everything you need
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0 }}>
              Built for drivers and fleet managers who demand the best
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {features.map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px', padding: '20px',
                cursor: 'default',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Bottom */}
        <div style={{ textAlign: 'center', padding: '0 24px 60px' }}>
          <div style={{
            maxWidth: '400px', margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(45,122,95,0.15), rgba(45,122,95,0.05))',
            border: '1px solid rgba(45,122,95,0.2)',
            borderRadius: '28px', padding: '36px 24px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Ready to roll?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: '0 0 24px' }}>
              Sign in to your account and take command of your fleet
            </p>
            <button onClick={() => router.push('/login')} className="btn" style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)',
              border: 'none', borderRadius: '16px', color: 'white',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(45,122,95,0.35)',
              transition: 'transform .1s',
            }}>
              Get Started →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '0 24px 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '24px 0 0' }}>
            Smith's Freight Hub · Fleet Management Platform · v2.0
          </p>
        </div>

      </div>
    </div>
  )
}
