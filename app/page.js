'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#0a0c0f', bg2: '#12151a', line: 'rgba(244,242,236,0.08)',
  diesel: '#2D7A5F', bright: '#4ade80', caution: '#f0a020',
  steel: '#9aa3b2', paper: '#f4f2ec', dim: 'rgba(244,242,236,0.5)', muted: 'rgba(244,242,236,0.25)',
}

const ROUTE = [
  { mm: '01', icon: '📋', title: 'Load Board', desc: 'Post and claim freight. Verified carriers only. No DAT fee.' },
  { mm: '02', icon: '🚛', title: 'Dispatch', desc: 'Assign loads in one tap. AI matches the best load to every truck.' },
  { mm: '03', icon: '📍', title: 'GPS Tracking', desc: 'Live fleet map. Auto-mileage logging. HOS compliance built in.' },
  { mm: '04', icon: '💰', title: 'Profit Center', desc: 'Real cost-per-mile. Know if a load makes money before you take it.' },
  { mm: '05', icon: '🏦', title: 'Factoring', desc: 'Get paid same day. 95% advance on every invoice.' },
  { mm: '06', icon: '📝', title: 'Tax Center', desc: 'Every deduction tracked automatically. IFTA done for you.' },
]

const COMPARE = [
  { tool: 'DAT Load Board', cost: '$59-149/mo' },
  { tool: 'Samsara / Motive (GPS)', cost: '$35-500/truck/mo' },
  { tool: 'QuickBooks', cost: '$30-200/mo' },
  { tool: 'Factoring company fee', cost: '2-5% per load' },
  { tool: 'Bookkeeper / CPA', cost: '$200-500/mo' },
]

export default function Landing() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const S = {
    page: { background: C.bg, color: C.paper, fontFamily: "'Inter',-apple-system,sans-serif", overflowX: 'hidden' },
    h1: { fontFamily: "'Archivo Black','Arial Black',sans-serif", textTransform: 'uppercase' },
    wrap: { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
    mono: { fontFamily: "'JetBrains Mono','Courier New',monospace" },
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @keyframes dash{to{background-position:-200px 0}}
        @keyframes drive{0%{left:-5%}100%{left:105%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .roadline{background-image:repeating-linear-gradient(90deg,${C.caution} 0 24px,transparent 24px 48px);background-size:200px 4px;animation:dash 3s linear infinite}
        .truckmove{animation:drive 8s linear infinite}
        .pulse{animation:blink 1.6s ease-in-out infinite}
        .stop{transition:transform .2s,border-color .2s}
        .stop:active{transform:scale(.97)}
        .pricecard{transition:transform .2s,border-color .2s}
        .pricecard:active{transform:scale(.98)}
        ::selection{background:${C.diesel};color:white}
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: scrolled ? 'rgba(10,12,15,0.92)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? `1px solid ${C.line}` : '1px solid transparent', transition: 'all .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: C.diesel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚛</div>
          <span style={{ ...S.h1, fontSize: 14, letterSpacing: 0.5 }}>TruckSuperSoftware</span>
        </div>
        <button onClick={() => router.push('/login')} style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, color: C.dim, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', paddingTop: 80, paddingBottom: 60 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, transform: 'translateY(-50%)' }} className="roadline" />
        <div style={{ ...S.wrap, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 4, background: 'rgba(45,122,95,0.12)', border: `1px solid rgba(45,122,95,0.3)`, marginBottom: 28 }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: C.bright }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.bright }}>Live · Carriers Onboarding Now</span>
          </div>
          <h1 style={{ ...S.h1, fontSize: 'clamp(40px,11vw,84px)', lineHeight: 0.95, marginBottom: 24 }}>
            One platform.<br /><span style={{ color: C.bright }}>Every dollar</span><br />you make.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: C.dim, maxWidth: 480, marginBottom: 36 }}>
            Stop paying five different companies to run your fleet. <strong style={{ color: C.paper }}>Load board, GPS, dispatch, payroll, factoring, and taxes — one price, one login.</strong>
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
            <button onClick={() => router.push('/signup')} style={{ padding: '17px 36px', background: C.diesel, border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}>
              🚛 Start Free 14-Day Trial
            </button>
            <a href="#route" style={{ padding: '17px 28px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}`, borderRadius: 8, color: C.dim, fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              See How It Works ↓
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
            {[['39+','Screens Built'],['72','API Endpoints'],['$0','Setup Fee']].map(([n, l]) => (
              <div key={l} style={{ background: C.bg, padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ ...S.mono, fontSize: 22, fontWeight: 700, color: C.bright }}>{n}</div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <div style={{ borderTop: `1px solid ${C.line}` }} />
      <section style={{ padding: '72px 0' }}>
        <div style={S.wrap}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.caution, marginBottom: 12 }}>The Problem</p>
          <h2 style={{ ...S.h1, fontSize: 'clamp(28px,6vw,44px)', lineHeight: 1.05, marginBottom: 20 }}>
            You're already paying for this.<br /><span style={{ color: C.caution }}>Just not in one place.</span>
          </h2>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {COMPARE.map((row, i) => (
              <div key={row.tool} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < COMPARE.length - 1 ? `1px solid ${C.line}` : 'none', background: C.bg2 }}>
                <span style={{ fontSize: 13, color: C.dim }}>{row.tool}</span>
                <span style={{ ...S.mono, fontSize: 13, fontWeight: 700, color: C.caution }}>{row.cost}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(45,122,95,0.1)' }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>TruckSuperSoftware — everything above</span>
              <span style={{ ...S.mono, fontSize: 16, fontWeight: 800, color: C.bright }}>$199/mo</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE ROUTE */}
      <div style={{ borderTop: `1px solid ${C.line}` }} />
      <section id="route" style={{ padding: '72px 0' }}>
        <div style={S.wrap}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.bright, marginBottom: 12 }}>The Route</p>
          <h2 style={{ ...S.h1, fontSize: 'clamp(28px,6vw,44px)', lineHeight: 1.05, marginBottom: 36 }}>
            Six stops.<br />One trip.
          </h2>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 23, top: 8, bottom: 8, width: 2, background: `linear-gradient(${C.bright},${C.diesel})` }} />
            {ROUTE.map((stop, i) => (
              <div key={stop.mm} className="stop" style={{ display: 'flex', gap: 18, marginBottom: i < ROUTE.length - 1 ? 28 : 0, position: 'relative' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg2, border: `2px solid ${C.bright}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, zIndex: 1 }}>
                  {stop.icon}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ ...S.mono, fontSize: 10, color: C.muted, letterSpacing: 1 }}>MM-{stop.mm}</span>
                    <span style={{ fontWeight: 800, fontSize: 17 }}>{stop.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>{stop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <div style={{ borderTop: `1px solid ${C.line}` }} />
      <section style={{ padding: '72px 0' }}>
        <div style={S.wrap}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.bright, marginBottom: 12 }}>Pricing</p>
          <h2 style={{ ...S.h1, fontSize: 'clamp(28px,6vw,44px)', lineHeight: 1.05, marginBottom: 36 }}>
            No contracts.<br />No setup fee.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Starter', price: 99, color: C.bright, trucks: '1-3 trucks', features: ['Fleet tracking', 'Load board access', 'Basic dispatch', 'DOT compliance'] },
              { name: 'Pro', price: 199, color: C.caution, trucks: '4-10 trucks', features: ['Everything in Starter', 'AI dispatch + load advisor', 'Profit Command Center', 'Freight factoring built in'], popular: true },
              { name: 'Enterprise', price: 399, color: '#a78bfa', trucks: '11+ trucks', features: ['Everything in Pro', 'Unlimited drivers', 'API access', 'Dedicated account manager'] },
            ].map(plan => (
              <div key={plan.name} className="pricecard" style={{ border: `1px solid ${plan.popular ? plan.color + '50' : C.line}`, borderRadius: 12, padding: 22, background: plan.popular ? 'rgba(240,160,32,0.05)' : C.bg2, position: 'relative' }}>
                {plan.popular && <div style={{ position: 'absolute', top: -10, right: 20, padding: '3px 12px', background: C.caution, borderRadius: 20, fontSize: 10, fontWeight: 800, color: '#0a0c0f' }}>MOST POPULAR</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: plan.color }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{plan.trucks}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...S.mono, fontSize: 28, fontWeight: 700, color: plan.color }}>${plan.price}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>/month</div>
                  </div>
                </div>
                {plan.features.map(f => (
                  <div key={f} style={{ fontSize: 12, color: C.dim, marginBottom: 4, display: 'flex', gap: 6 }}><span style={{ color: plan.color }}>✓</span>{f}</div>
                ))}
                <button onClick={() => router.push(`/signup?plan=${plan.name.toLowerCase()}`)} style={{ width: '100%', marginTop: 14, padding: 12, background: `${plan.color}1a`, border: `1px solid ${plan.color}40`, borderRadius: 8, color: plan.color, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Start {plan.name} Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div style={{ borderTop: `1px solid ${C.line}` }} />
      <section style={{ padding: '80px 0 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, height: 3 }} className="roadline" />
        <div style={{ position: 'absolute', bottom: 22, fontSize: 22 }} className="truckmove">🚛</div>
        <div style={S.wrap}>
          <h2 style={{ ...S.h1, fontSize: 'clamp(32px,7vw,56px)', lineHeight: 1, marginBottom: 20 }}>
            Your fleet runs<br /><span style={{ color: C.bright }}>better tomorrow.</span>
          </h2>
          <p style={{ fontSize: 15, color: C.dim, marginBottom: 32 }}>14 days free. Cancel anytime. No commitment.</p>
          <button onClick={() => router.push('/signup')} style={{ padding: '18px 44px', background: C.diesel, border: 'none', borderRadius: 8, color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
            🚛 Start Your Free Trial
          </button>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: C.muted }}>TruckSuperSoftware · Built for the road</p>
      </footer>
    </div>
  )
}
