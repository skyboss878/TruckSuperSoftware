'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  { id:'starter',name:'Starter',price:99,color:'#4ade80',trucks:'1-3 trucks',features:['Fleet tracking','Load board','Basic dispatch','DOT compliance','Email support'] },
  { id:'pro',name:'Pro',price:199,color:'#f59e0b',trucks:'4-10 trucks',features:['Everything in Starter','AI dispatch','Profit Command Center','Freight factoring','RTS fuel card','Priority support'],popular:true },
  { id:'enterprise',name:'Enterprise',price:399,color:'#a78bfa',trucks:'11+ trucks',features:['Everything in Pro','Unlimited drivers','API access','Custom integrations','Dedicated manager','White glove onboarding'] },
]

export default function Billing() {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])

  const planColor = p => p==='enterprise'?'#a78bfa':p==='pro'?'#f59e0b':'#4ade80'
  const statusColor = s => s==='active'?'#4ade80':s==='trial'?'#f59e0b':s==='past_due'?'#f87171':'#6b7280'

  async function openPortal() {
    if (!company?.id) return
    setLoading(true)
    const res = await fetch('/api/paypal/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: company.id })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  async function upgrade(plan) {
    if (!company?.id) return
    setLoading(true)
    const res = await fetch('/api/paypal/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: company.id, plan, email: company.email, company_name: company.name })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh',background:'#050c14',color:'white',fontFamily:'-apple-system,sans-serif',paddingBottom:80 }}>
      <div style={{ background:'linear-gradient(135deg,#0a1628,#0d2137)',padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <button onClick={()=>router.push('/admin')} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:14,cursor:'pointer',padding:0 }}>← Back</button>
          <div>
            <h1 style={{ fontSize:18,fontWeight:900,margin:0 }}>💳 Billing & Subscription</h1>
            <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',margin:'2px 0 0' }}>Manage your TruckSuperSoftware plan</p>
          </div>
        </div>
      </div>

      <div style={{ padding:16,maxWidth:520,margin:'0 auto' }}>

        {/* Current plan */}
        <div style={{ background:'rgba(255,255,255,0.04)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',padding:20,marginBottom:16 }}>
          <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:8,textTransform:'uppercase',letterSpacing:2 }}>Current Plan</p>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <div>
              <div style={{ fontSize:22,fontWeight:900,color:planColor(company?.plan||'pro'),textTransform:'capitalize' }}>{company?.plan||'Pro'}</div>
              <div style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>${company?.plan==='enterprise'?399:company?.plan==='starter'?99:199}/month</div>
            </div>
            <div style={{ padding:'6px 14px',borderRadius:8,background:`${statusColor(company?.plan_status||'trial')}20`,color:statusColor(company?.plan_status||'trial'),fontWeight:700,fontSize:13 }}>
              {company?.plan_status||'TRIAL'}
            </div>
          </div>
          {company?.trial_ends_at && (
            <div style={{ fontSize:12,color:'rgba(245,158,11,0.8)',marginBottom:16 }}>
              ⏱️ Trial ends {new Date(company.trial_ends_at).toLocaleDateString()}
            </div>
          )}
          <button onClick={openPortal} disabled={loading} style={{ width:'100%',padding:14,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'white',fontWeight:700,fontSize:14,cursor:'pointer' }}>
            {loading?'Loading...':'Manage Billing & Invoices →'}
          </button>
        </div>

        {/* Plans */}
        <p style={{ fontSize:13,fontWeight:800,marginBottom:12,color:'rgba(255,255,255,0.6)' }}>Available Plans</p>
        {PLANS.map(plan=>(
          <div key={plan.id}
            style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:`1px solid ${company?.plan===plan.id?`${plan.color}40`:'rgba(255,255,255,0.07)'}`,padding:18,marginBottom:10,position:'relative' }}>
            {plan.popular&&<div style={{ position:'absolute',top:-10,right:16,padding:'3px 12px',background:'#f59e0b',borderRadius:20,fontSize:10,fontWeight:800,color:'#060608' }}>MOST POPULAR</div>}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:900,color:plan.color }}>{plan.name}</div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>{plan.trucks}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:24,fontWeight:900,color:plan.color }}>${plan.price}</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>per month</div>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              {plan.features.map(f=>(
                <div key={f} style={{ fontSize:12,color:'rgba(255,255,255,0.6)',display:'flex',gap:8,marginBottom:3 }}>
                  <span style={{ color:plan.color }}>✓</span>{f}
                </div>
              ))}
            </div>
            {company?.plan===plan.id?(
              <div style={{ padding:'10px 16px',background:`${plan.color}15`,border:`1px solid ${plan.color}30`,borderRadius:10,textAlign:'center',fontSize:13,fontWeight:700,color:plan.color }}>
                ✓ Current Plan
              </div>
            ):(
              <button onClick={()=>upgrade(plan.id)} disabled={loading}
                style={{ width:'100%',padding:12,background:`${plan.color}20`,border:`1px solid ${plan.color}40`,borderRadius:10,color:plan.color,fontWeight:700,fontSize:13,cursor:'pointer' }}>
                {loading?'Loading...':company?.plan?`Switch to ${plan.name}`:`Start ${plan.name}`}
              </button>
            )}
          </div>
        ))}

        <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',padding:14,fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.7,textAlign:'center' }}>
          🔒 Payments secured by Stripe · Cancel anytime · 14-day free trial on all plans
        </div>
      </div>
    </div>
  )
}
