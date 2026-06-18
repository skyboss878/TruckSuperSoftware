'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdmin() {
  const router = useRouter()
  const [companies, setCompanies] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/superadmin/companies').then(r => r.json()),
        fetch('/api/superadmin/stats').then(r => r.json()),
      ])
      setCompanies(cRes.companies || [])
      setStats(sRes)
    } catch(err) { console.error(err) }
    setLoading(false)
  }

  const filtered = companies.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.dot_number?.includes(search)
  )

  const fmt = n => `$${(n||0).toLocaleString('en',{maximumFractionDigits:0})}`
  const planColor = p => p==='enterprise'?'#a78bfa':p==='pro'?'#f59e0b':'#4ade80'
  const statusColor = s => s==='active'?'#4ade80':s==='trial'?'#f59e0b':s==='past_due'?'#f87171':'#6b7280'

  return (
    <div style={{ minHeight:'100vh',background:'#050c14',color:'white',fontFamily:'-apple-system,sans-serif',paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0a1628,#0d2137)',padding:'20px 16px 0',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:18,fontWeight:900,margin:0 }}>⚡ Super Admin</h1>
            <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',margin:'2px 0 0' }}>TruckSuperSoftware Platform Dashboard</p>
          </div>
          <button onClick={loadAll} style={{ padding:'8px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'rgba(255,255,255,0.6)',fontSize:12,cursor:'pointer' }}>
            🔄 Refresh
          </button>
        </div>
        <div style={{ display:'flex',gap:0,overflowX:'auto' }}>
          {[['overview','📊 Overview'],['companies','🏢 Companies'],['revenue','💰 Revenue'],['signups','📋 Signups']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 14px',background:'none',border:'none',borderBottom:tab===k?'2px solid #2D7A5F':'2px solid transparent',color:tab===k?'#4ade80':'rgba(255,255,255,0.4)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}>{l}</button>
          ))}
        </div>
      </div>

      {tab==='overview' && (
        <div style={{ padding:16 }}>
          {/* Key metrics */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            {[
              { label:'Total Companies',value:stats?.total_companies||companies.length,color:'#60a5fa',icon:'🏢' },
              { label:'Active Subscriptions',value:stats?.active_companies||companies.filter(c=>c.plan_status==='active').length,color:'#4ade80',icon:'✅' },
              { label:'On Trial',value:stats?.trial_companies||companies.filter(c=>c.plan_status==='trial').length,color:'#f59e0b',icon:'⏱️' },
              { label:'MRR',value:fmt(companies.filter(c=>c.plan_status==='active').reduce((s,c)=>s+(c.plan==='enterprise'?399:c.plan==='pro'?199:99),0)),color:'#4ade80',icon:'💰' },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)',borderRadius:14,padding:14,border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:22,marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22,fontWeight:900,color:s.color,lineHeight:1,marginBottom:2 }}>{s.value}</div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Plan breakdown */}
          <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden',marginBottom:12 }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>📊 Plan Distribution</p>
            </div>
            {['starter','pro','enterprise'].map(plan=>{
              const count = companies.filter(c=>c.plan===plan).length
              const pct = companies.length>0?(count/companies.length)*100:0
              const revenue = count*(plan==='enterprise'?399:plan==='pro'?199:99)
              return (
                <div key={plan} style={{ padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                    <span style={{ fontSize:13,color:'rgba(255,255,255,0.7)',textTransform:'capitalize',fontWeight:700 }}>{plan}</span>
                    <div style={{ display:'flex',gap:12 }}>
                      <span style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>{count} companies</span>
                      <span style={{ fontSize:13,fontWeight:700,color:planColor(plan) }}>{fmt(revenue)}/mo</span>
                    </div>
                  </div>
                  <div style={{ height:4,background:'rgba(255,255,255,0.06)',borderRadius:2 }}>
                    <div style={{ height:'100%',background:planColor(plan),borderRadius:2,width:`${pct}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent signups */}
          <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden' }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>🆕 Recent Companies</p>
            </div>
            {companies.slice(0,5).map(c=>(
              <div key={c.id} style={{ padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:700 }}>{c.name}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{c.email}</div>
                </div>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:`${planColor(c.plan)}20`,color:planColor(c.plan),fontWeight:700,textTransform:'capitalize' }}>{c.plan}</span>
                  <span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:`${statusColor(c.plan_status)}20`,color:statusColor(c.plan_status),fontWeight:700 }}>{c.plan_status}</span>
                </div>
              </div>
            ))}
            {companies.length===0&&<div style={{ padding:'32px 16px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13 }}>No companies yet. Share the signup link to get carriers onboarding.</div>}
          </div>
        </div>
      )}

      {tab==='companies' && (
        <div style={{ padding:16 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search companies, email, DOT..."
            style={{ width:'100%',padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'white',fontSize:14,outline:'none',marginBottom:12 }}/>

          {filtered.length===0?(
            <div style={{ textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize:48,marginBottom:12 }}>🏢</div>
              <p>{search?'No companies match your search':'No companies yet'}</p>
              <p style={{ fontSize:12,marginTop:8 }}>Share: truck-super-software.vercel.app/signup</p>
            </div>
          ):filtered.map(c=>(
            <div key={c.id} style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',padding:16,marginBottom:8 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15,fontWeight:800 }}>{c.name}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{c.email} · {c.phone}</div>
                  {c.dot_number&&<div style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>DOT #{c.dot_number}</div>}
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end' }}>
                  <span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:`${planColor(c.plan)}20`,color:planColor(c.plan),fontWeight:700,textTransform:'capitalize' }}>{c.plan}</span>
                  <span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:`${statusColor(c.plan_status)}20`,color:statusColor(c.plan_status),fontWeight:700 }}>{c.plan_status}</span>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {[
                  { label:'Trucks',value:c.num_trucks||'—' },
                  { label:'State',value:c.state||'—' },
                  { label:'Signed Up',value:c.created_at?new Date(c.created_at).toLocaleDateString():'—' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'8px 10px',textAlign:'center' }}>
                    <div style={{ fontSize:13,fontWeight:700 }}>{s.value}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {(c.rts_fuel_card||c.rts_factoring)&&(
                <div style={{ marginTop:10,display:'flex',gap:6 }}>
                  {c.rts_fuel_card&&<span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:'rgba(230,57,70,0.1)',color:'#f87171',fontWeight:700 }}>⛽ RTS Fuel Card</span>}
                  {c.rts_factoring&&<span style={{ fontSize:10,padding:'3px 8px',borderRadius:4,background:'rgba(230,57,70,0.1)',color:'#f87171',fontWeight:700 }}>🏦 RTS Factoring</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==='revenue' && (
        <div style={{ padding:16 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(45,122,95,0.12),rgba(45,122,95,0.04))',border:'1px solid rgba(45,122,95,0.2)',borderRadius:20,padding:24,marginBottom:16,textAlign:'center' }}>
            <p style={{ fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:2,textTransform:'uppercase',marginBottom:8 }}>Monthly Recurring Revenue</p>
            <div style={{ fontSize:52,fontWeight:900,color:'#4ade80',letterSpacing:-2,lineHeight:1 }}>
              {fmt(companies.filter(c=>c.plan_status==='active').reduce((s,c)=>s+(c.plan==='enterprise'?399:c.plan==='pro'?199:99),0))}
            </div>
            <div style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:4 }}>from {companies.filter(c=>c.plan_status==='active').length} active subscribers</div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden',marginBottom:12 }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>📈 Revenue at Scale</p>
            </div>
            {[
              { companies:10,label:'10 companies' },
              { companies:50,label:'50 companies' },
              { companies:100,label:'100 companies' },
              { companies:500,label:'500 companies' },
              { companies:1000,label:'1,000 companies' },
            ].map(s=>{
              const mrr = s.companies*199
              const arr = mrr*12
              return (
                <div key={s.companies} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:13,color:'rgba(255,255,255,0.6)' }}>{s.label} (avg Pro)</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14,fontWeight:800,color:'#4ade80' }}>{fmt(mrr)}/mo</div>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>{fmt(arr)}/yr</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='signups' && (
        <div style={{ padding:16 }}>
          <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden',marginBottom:16 }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>📋 Pending Signups</p>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',margin:'2px 0 0' }}>Carriers who completed signup — awaiting activation</p>
            </div>
            <div style={{ padding:'32px 16px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13 }}>
              <div style={{ fontSize:48,marginBottom:12 }}>📋</div>
              <p>Share the signup link to start getting carriers</p>
              <div style={{ marginTop:16,padding:12,background:'rgba(255,255,255,0.04)',borderRadius:10,fontSize:12,color:'#4ade80',fontWeight:700,letterSpacing:0.5 }}>
                truck-super-software.vercel.app/signup
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
