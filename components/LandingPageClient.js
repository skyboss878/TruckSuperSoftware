'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const FEATURES = [
  { icon: '📍', title: 'Live Fleet Map', desc: 'Real-time GPS tracking. See every truck on the road, updated every 30 seconds.' },
  { icon: '🤖', title: 'AI Dispatch', desc: 'Ask anything. Approve tickets, message drivers, pull reports — all by voice or text.' },
  { icon: '⏱️', title: 'HOS Logging', desc: '11hr drive clock, 14hr window, 70hr weekly limit. Fully automated.' },
  { icon: '✅', title: 'DOT Pre-Trip', desc: 'Mandatory safety inspections enforced before every shift. Never miss one again.' },
  { icon: '⛽', title: 'IFTA Reports', desc: 'State-by-state fuel tax calculated automatically from GPS data. One click export.' },
  { icon: '📷', title: 'AI Doc Scanner', desc: 'Snap a BOL or fuel receipt. AI extracts and logs every field instantly.' },
  { icon: '🚨', title: 'Panic Button', desc: 'One tap sends GPS coordinates and an alert to every admin device immediately.' },
  { icon: '💰', title: 'Settlements', desc: 'Per-mile and per-load pay calculated automatically from verified GPS mileage.' },
]

const STATS = [
  { value: '< 2s', label: 'Page Load' },
  { value: '0%', label: 'Error Rate' },
  { value: '24/7', label: 'Live Data' },
  { value: '100%', label: 'Uptime' },
]

export default function LandingPageClient({ apiCount, pageCount }) {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.5 + 0.1,
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(45,122,95,${p.a})`
        ctx.fill()
      })
      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(45,122,95,${0.15 * (1 - dist/120)})`
            ctx.lineWidth = 0.5
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

  // Scroll
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-cycle features
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(45,122,95,0.3)} 50%{box-shadow:0 0 60px rgba(45,122,95,0.7)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .btn-primary { transition: all 0.2s; }
        .btn-primary:active { transform: scale(0.97); }
        .feature-pill:hover { background: rgba(45,122,95,0.2) !important; border-color: rgba(45,122,95,0.5) !important; }
        .stat-card { transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Particle Canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrollY > 40 ? 'rgba(5,12,20,0.95)' : 'transparent', backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none', borderBottom: scrollY > 40 ? '1px solid rgba(45,122,95,0.15)' : 'none', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2D7A5F, #1a4d3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, animation: 'glow 3s ease-in-out infinite' }}>🚛</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>Smith's Freight Hub</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(45,122,95,0.15)', border: '1px solid rgba(45,122,95,0.3)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Get Started →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center' }}>
        {/* Live badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(45,122,95,0.1)', border: '1px solid rgba(45,122,95,0.25)', marginBottom: 28 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Live Platform · Active Now</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(38px, 8vw, 64px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 20px', maxWidth: 700 }}>
          Fleet Management<br />
          <span style={{ background: 'linear-gradient(135deg, #2D7A5F 0%, #4ade80 50%, #2D7A5F 100%)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'spin 4s linear infinite' }}>Built Different.</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, lineHeight: 1.7, maxWidth: 520, margin: '0 0 40px' }}>
          Real-time GPS, AI dispatch, DOT compliance, and automated payroll — purpose-built for Smith's fleet. No bloat. No contracts. Just results.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '16px 36px', borderRadius: 16, background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 40px rgba(45,122,95,0.5)', animation: 'glow 3s ease-in-out infinite' }}>
            🚛 Driver Login
          </button>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '16px 36px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            ⚙️ Admin Portal
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 480, width: '100%', margin: '0 auto' }}>
          {STATS.map(s => (
            <div key={s.label} className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 8px', textAlign: 'center' }}>
              <div style={{ color: '#2D7A5F', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.3 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)' }} />
        </div>
      </div>

      {/* Features section */}
      <div style={{ position: 'relative', zIndex: 1, padding: '80px 24px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: '#2D7A5F', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Platform Features</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', margin: '0 0 12px' }}>Everything in one place.</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>No separate apps. No integrations. One platform runs the whole operation.</p>
        </div>

        {/* Feature spotlight */}
        <div style={{ background: 'rgba(45,122,95,0.08)', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 24, padding: '32px 24px', marginBottom: 24, minHeight: 120, transition: 'all 0.3s' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{FEATURES[activeFeature].icon}</div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{FEATURES[activeFeature].title}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>{FEATURES[activeFeature].desc}</div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {FEATURES.map((f, i) => (
            <button key={i} onClick={() => setActiveFeature(i)} className="feature-pill" style={{ padding: '8px 14px', borderRadius: 20, background: i === activeFeature ? 'rgba(45,122,95,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === activeFeature ? 'rgba(45,122,95,0.5)' : 'rgba(255,255,255,0.08)'}`, color: i === activeFeature ? '#4ade80' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              {f.icon} {f.title}
            </button>
          ))}
        </div>
      </div>

      {/* vs Competitors */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 24px 80px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>Why not Samsara or Motive?</h3>
          </div>
          {[
            { label: 'Built for YOUR operation', us: true, them: false },
            { label: 'No hardware required', us: true, them: false },
            { label: 'AI-native from day one', us: true, them: false },
            { label: 'Custom payroll & settlements', us: true, them: false },
            { label: 'No per-seat pricing', us: true, them: false },
            { label: 'Direct support from your team', us: true, them: false },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '14px 24px', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{row.label}</span>
              <span style={{ textAlign: 'center', color: '#4ade80', fontWeight: 700, fontSize: 16 }}>✓</span>
              <span style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>✗</span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '12px 24px', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }} />
            <span style={{ textAlign: 'center', color: '#2D7A5F', fontSize: 11, fontWeight: 700 }}>Smith's</span>
            <span style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Others</span>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 420, margin: '0 auto', background: 'linear-gradient(135deg, rgba(45,122,95,0.12), rgba(45,122,95,0.04))', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 28, padding: '40px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🚀</div>
          <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Ready to roll?</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>Sign in and take command of your fleet.</p>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,122,95,0.35)' }}>
            Get Started →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px 32px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '24px 0 0' }}>
          Smith's Freight Hub · Built for the road · v2.0
        </p>
      </div>
    </div>
  )
}
