'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const STEPS = [
  { num: 1, label: 'Company Info' },
  { num: 2, label: 'DOT Verification' },
  { num: 3, label: 'Fleet Details' },
  { num: 4, label: 'Account Setup' },
  { num: 5, label: 'Choose Plan' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    color: '#4ade80',
    trucks: '1-3 trucks',
    features: ['Fleet tracking', 'Load board access', 'Basic dispatching', 'DOT compliance', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    color: '#f59e0b',
    trucks: '4-10 trucks',
    features: ['Everything in Starter', 'AI dispatch assistant', 'Profit Command Center', 'Freight factoring', 'RTS fuel card', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    color: '#a78bfa',
    trucks: '11+ trucks',
    features: ['Everything in Pro', 'Unlimited drivers', 'Custom integrations', 'API access', 'Dedicated account manager', 'White glove onboarding'],
  },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    // Step 1
    company_name: '', contact_name: '', phone: '', email: '',
    address: '', city: '', state: '', zip: '',
    // Step 2
    dot_number: '', mc_number: '',
    // Step 3
    num_trucks: '', equipment_types: [], avg_miles_month: '',
    primary_lanes: '', commodities: '',
    // Step 4
    password: '', confirm_password: '',
    // Step 5
    plan: 'pro', // overridden by ?plan= below
    fuel_card: true,
    factoring: true,
  })

  function update(key, val) { setForm(f => ({ ...f, [key]: val })) }

  useEffect(() => {
    const p = searchParams.get('plan')
    if (p && PLANS.some(pl => pl.id === p)) update('plan', p)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/billing?new=true')
    })
  }, [])

  function toggleEquipment(type) {
    const arr = form.equipment_types
    update('equipment_types', arr.includes(type) ? arr.filter(t => t !== type) : [...arr, type])
  }

  async function verifyDOT() {
    if (!form.dot_number) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/verify-carrier?dot=${form.dot_number}`)
      const data = await res.json()
      setVerified(data)
      if (data.company_name && !form.company_name) update('company_name', data.company_name)
    } catch { setVerified({ error: 'Could not verify. Continue manually.' }) }
    setVerifying(false)
  }

  async function submit() {
    setSubmitting(true)
    try {
      // Create the actual auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/billing?new=true`,
        },
      })
      if (authError) {
        alert(authError.message || authError.msg || JSON.stringify(authError))
        setSubmitting(false)
        return
      }

      // Save to Supabase via API, linking the new auth user
      await fetch('/api/carrier-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: authData.user?.id })
      })

      // Auto sign in and redirect to billing
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (!signInError) {
        router.push('/billing?new=true')
        return
      }
      setDone(true)
    } catch (err) {
      console.error('[Signup] Error:', err)
      alert('Something went wrong creating your account. Please try again.')
    }
    setSubmitting(false)
  }

  const S = {
    page: { minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system,sans-serif' },
    input: { width: '100%', padding: '13px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none', fontFamily: '-apple-system,sans-serif' },
    label: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', fontWeight: 600 },
    btn: { width: '100%', padding: 16, background: '#2D7A5F', border: 'none', borderRadius: 14, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  }

  if (done) return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>🚛</div>
      <h1 style={{ fontFamily: '-apple-system,sans-serif', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>You're on board!</h1>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 8, maxWidth: 400 }}>Welcome to TruckSuperSoftware. Your account is ready to go — log in to access your dashboard.</p>
      <p style={{ fontSize: 14, color: '#4ade80', marginBottom: 32 }}>{form.email}</p>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Your plan</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', marginBottom: 4 }}>{PLANS.find(p => p.id === form.plan)?.name}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>${PLANS.find(p => p.id === form.plan)?.price}/month</div>
        {form.fuel_card && <div style={{ marginTop: 10, fontSize: 12, color: '#4ade80' }}>✅ RTS Fuel Card included</div>}
        {form.factoring && <div style={{ fontSize: 12, color: '#4ade80' }}>✅ Freight factoring enabled</div>}
      </div>
      <button onClick={() => router.push('/billing?new=true')} style={S.btn}>Start {PLANS.find(p => p.id === form.plan)?.name} — ${PLANS.find(p => p.id === form.plan)?.price}/mo →</button>
    </div>
  )

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0a1628,#0d2137)', padding: '20px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#2D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚛</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>TruckSuperSoftware</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>Carrier Onboarding</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ flex: 1, height: 3, borderRadius: 2, background: s.num <= step ? '#2D7A5F' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Step {step} of {STEPS.length}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{STEPS[step-1].label}</div>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 520, margin: '0 auto' }}>

        {/* STEP 1 — Company Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Tell us about your company</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>We'll get your fleet set up in minutes.</p>
            </div>
            {[
              ['company_name','Company / Carrier Name *'],
              ['contact_name','Your Full Name *'],
              ['phone','Phone Number *'],
              ['email','Email Address *'],
              ['address','Street Address'],
              ['city','City'],
            ].map(([key, label]) => (
              <div key={key}>
                <label style={S.label}>{label}</label>
                <input value={form[key]} onChange={e => update(key, e.target.value)}
                  placeholder={label.replace(' *','')} style={S.input} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={S.label}>State</label>
                <input value={form.state} onChange={e => update('state', e.target.value)} placeholder="TX" style={S.input} />
              </div>
              <div>
                <label style={S.label}>ZIP</label>
                <input value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="75001" style={S.input} />
              </div>
            </div>
            <button onClick={() => form.company_name && form.contact_name && form.email && setStep(2)}
              style={{ ...S.btn, opacity: form.company_name && form.contact_name && form.email ? 1 : 0.4 }}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2 — DOT Verification */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Verify your authority</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Enter your DOT number to verify your carrier authority via FMCSA.</p>
            </div>

            <div>
              <label style={S.label}>USDOT Number *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={form.dot_number} onChange={e => update('dot_number', e.target.value)}
                  placeholder="e.g. 1234567" style={{ ...S.input, flex: 1 }} />
                <button onClick={verifyDOT} disabled={verifying || !form.dot_number}
                  style={{ padding: '13px 18px', borderRadius: 12, background: 'rgba(45,122,95,0.3)', border: '1px solid rgba(45,122,95,0.4)', color: '#4ade80', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !form.dot_number ? 0.4 : 1 }}>
                  {verifying ? '...' : '🔍 Verify'}
                </button>
              </div>
            </div>

            {verified && !verified.error && (
              <div style={{ background: 'rgba(45,122,95,0.1)', border: '1px solid rgba(45,122,95,0.25)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{verified.company_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>DOT #{verified.dot_number}</div>
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: 6, background: verified.authority_status === 'active' ? 'rgba(45,122,95,0.2)' : 'rgba(239,68,68,0.2)', color: verified.authority_status === 'active' ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 12 }}>
                    {verified.authority_status === 'active' ? '✓ ACTIVE' : '✗ INACTIVE'}
                  </div>
                </div>
                {[['Safety Rating', verified.safety_rating], ['Insurance', verified.insurance_status], ['Trucks', verified.total_trucks], ['Drivers', verified.total_drivers]].map(([k, v]) => v && (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{String(v).replace(/_/g,' ')}</span>
                  </div>
                ))}
              </div>
            )}

            {verified?.error && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 14, fontSize: 13, color: '#f59e0b' }}>
                ⚠️ {verified.error}
              </div>
            )}

            <div>
              <label style={S.label}>MC Number (optional)</label>
              <input value={form.mc_number} onChange={e => update('mc_number', e.target.value)}
                placeholder="e.g. MC-123456" style={S.input} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>← Back</button>
              <button onClick={() => form.dot_number && setStep(3)} style={{ ...S.btn, flex: 2, opacity: form.dot_number ? 1 : 0.4 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Fleet Details */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Tell us about your fleet</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>This helps us match you with the right loads and features.</p>
            </div>

            <div>
              <label style={S.label}>Number of Trucks *</label>
              <input type="number" value={form.num_trucks} onChange={e => update('num_trucks', e.target.value)}
                placeholder="e.g. 5" style={S.input} />
            </div>

            <div>
              <label style={S.label}>Equipment Types</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['Dry Van','Flatbed','Reefer','Tanker','Step Deck','Lowboy','Box Truck','Sprinter'].map(type => (
                  <button key={type} onClick={() => toggleEquipment(type)}
                    style={{ padding: '10px 14px', borderRadius: 10, background: form.equipment_types.includes(type) ? 'rgba(45,122,95,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${form.equipment_types.includes(type) ? 'rgba(45,122,95,0.4)' : 'rgba(255,255,255,0.1)'}`, color: form.equipment_types.includes(type) ? '#4ade80' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    {form.equipment_types.includes(type) ? '✓ ' : ''}{type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={S.label}>Average Miles Per Month</label>
              <input type="number" value={form.avg_miles_month} onChange={e => update('avg_miles_month', e.target.value)}
                placeholder="e.g. 10000" style={S.input} />
            </div>

            <div>
              <label style={S.label}>Primary Lanes (where do you run?)</label>
              <input value={form.primary_lanes} onChange={e => update('primary_lanes', e.target.value)}
                placeholder="e.g. Texas, Oklahoma, Louisiana" style={S.input} />
            </div>

            <div>
              <label style={S.label}>Primary Commodities</label>
              <input value={form.commodities} onChange={e => update('commodities', e.target.value)}
                placeholder="e.g. Oil field equipment, general freight" style={S.input} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>← Back</button>
              <button onClick={() => form.num_trucks && setStep(4)} style={{ ...S.btn, flex: 2, opacity: form.num_trucks ? 1 : 0.4 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Account Setup */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Create your account</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Set up your login credentials.</p>
            </div>

            <div style={{ background: 'rgba(45,122,95,0.08)', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Signing up as</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{form.company_name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{form.email}</div>
            </div>

            <div>
              <label style={S.label}>Password *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                placeholder="Min 8 characters" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Confirm Password *</label>
              <input type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)}
                placeholder="Confirm password" style={S.input} />
            </div>

            {form.password && form.confirm_password && form.password !== form.confirm_password && (
              <div style={{ fontSize: 12, color: '#f87171' }}>⚠️ Passwords don't match</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>← Back</button>
              <button onClick={() => form.password && form.password === form.confirm_password && setStep(5)}
                style={{ ...S.btn, flex: 2, opacity: form.password && form.password === form.confirm_password ? 1 : 0.4 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Choose Plan */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Choose your plan</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Start free for 14 days. No credit card required.</p>
            </div>

            {PLANS.map(plan => (
              <div key={plan.id} onClick={() => update('plan', plan.id)}
                style={{ background: form.plan === plan.id ? 'rgba(45,122,95,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.plan === plan.id ? 'rgba(45,122,95,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: 18, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                {plan.popular && <div style={{ position: 'absolute', top: -10, right: 16, padding: '3px 12px', background: '#f59e0b', borderRadius: 20, fontSize: 10, fontWeight: 800, color: '#060608' }}>MOST POPULAR</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: plan.color }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{plan.trucks}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: plan.color }}>${plan.price}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>per month</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8 }}>
                      <span style={{ color: plan.color }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* RTS Add-ons */}
            <div style={{ background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.15)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: '#f87171' }}>⚡ RTS Financial Add-ons (Free)</div>
              {[
                { key: 'fuel_card', icon: '⛽', title: 'RTS Fuel Card', desc: 'Discounts at 1,500+ truck stops nationwide' },
                { key: 'factoring', icon: '🏦', title: 'Freight Factoring', desc: 'Get paid today — 95% advance, same day' },
              ].map(addon => (
                <div key={addon.key} onClick={() => update(addon.key, !form[addon.key])}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: form[addon.key] ? '#2D7A5F' : 'rgba(255,255,255,0.1)', border: `1px solid ${form[addon.key] ? '#2D7A5F' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                    {form[addon.key] ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{addon.icon} {addon.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{addon.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(4)} style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>← Back</button>
              <button onClick={submit} disabled={submitting} style={{ ...S.btn, flex: 2, background: 'linear-gradient(135deg,#2D7A5F,#1a5c44)', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Setting up...' : '🚛 Start Free Trial'}
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


export default function Signup() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0c0f' }} />}>
      <SignupForm />
    </Suspense>
  )
}
