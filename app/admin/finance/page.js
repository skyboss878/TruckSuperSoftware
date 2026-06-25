'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api-client'

const CATS = [
  { key:'fuel',label:'Fuel',icon:'⛽',color:'#f59e0b' },
  { key:'maintenance',label:'Maintenance',icon:'🔧',color:'#60a5fa' },
  { key:'insurance',label:'Insurance',icon:'🛡️',color:'#a78bfa' },
  { key:'driver_pay',label:'Driver Pay',icon:'👨‍✈️',color:'#4ade80' },
  { key:'permits',label:'Permits',icon:'📋',color:'#fb923c' },
  { key:'tires',label:'Tires',icon:'🛞',color:'#34d399' },
  { key:'tolls',label:'Tolls',icon:'🛣️',color:'#f472b6' },
  { key:'per_diem',label:'Per Diem',icon:'🏨',color:'#fbbf24' },
  { key:'eld',label:'ELD/Software',icon:'📱',color:'#818cf8' },
  { key:'lodging',label:'Lodging',icon:'🏩',color:'#2dd4bf' },
  { key:'meals',label:'Meals',icon:'🍽️',color:'#f87171' },
  { key:'phone',label:'Phone',icon:'📞',color:'#94a3b8' },
  { key:'equipment',label:'Equipment',icon:'🏗️',color:'#c084fc' },
  { key:'other',label:'Other',icon:'📦',color:'#6b7280' },
]

const S = {
  page:{ minHeight:'100vh',background:'#050c14',color:'white',fontFamily:'-apple-system,sans-serif',paddingBottom:80 },
  hdr:{ background:'linear-gradient(135deg,#0a1628,#0d2137)',padding:'20px 16px 0',borderBottom:'1px solid rgba(255,255,255,0.07)' },
  pad:{ padding:16 },
  card:{ background:'rgba(255,255,255,0.04)',borderRadius:14,padding:14,border:'1px solid rgba(255,255,255,0.07)' },
  darkCard:{ background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden' },
  row:{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)' },
  input:{ padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'white',fontSize:14,outline:'none',width:'100%' },
  btn:{ padding:15,background:'#2D7A5F',border:'none',borderRadius:14,color:'white',fontWeight:800,fontSize:15,cursor:'pointer',width:'100%' },
  modal:{ position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'flex-end' },
  modalInner:{ background:'#0d1117',borderRadius:'24px 24px 0 0',width:'100%',padding:'24px 20px 40px',maxHeight:'85vh',overflowY:'auto',border:'1px solid rgba(255,255,255,0.1)' },
}

export default function Finance() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [revenue, setRevenue] = useState([])
  const [factoring, setFactoring] = useState([])
  const [aiAdvice, setAiAdvice] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showRev, setShowRev] = useState(false)
  const [showFac, setShowFac] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expForm, setExpForm] = useState({ date:new Date().toISOString().split('T')[0],category:'fuel',amount:'',description:'',vendor:'',truck_number:'',state:'',gallons:'' })
  const [revForm, setRevForm] = useState({ date:new Date().toISOString().split('T')[0],source:'load',amount:'',description:'',miles:'',origin_state:'',destination_state:'',broker_name:'',payment_status:'pending' })
  const [facForm, setFacForm] = useState({ invoice_amount:'',advance_rate:95,factoring_fee_pct:3,broker_name:'',broker_payment_days:30 })

  useEffect(() => { loadAll() }, [year])

  async function loadAll() {
    setLoading(true)
    try {
      const [s,e,r,f] = await Promise.all([
        authFetch(`/api/tax?year=${year}`).then(x=>x.json()),
        authFetch(`/api/expenses?year=${year}`).then(x=>x.json()),
        authFetch(`/api/revenue?year=${year}`).then(x=>x.json()),
        authFetch('/api/factoring').then(x=>x.json()),
      ])
      setSummary(s); setExpenses(e.expenses||[]); setRevenue(r.records||[]); setFactoring(f.records||[])
    } catch(err){ console.error(err) }
    setLoading(false)
  }

  async function addExpense() {
    if (!expForm.amount||!expForm.category) return
    setSaving(true)
    await authFetch('/api/expenses',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(expForm) })
    setShowExp(false); setSaving(false); loadAll()
  }

  async function addRevenue() {
    if (!revForm.amount) return
    setSaving(true)
    await authFetch('/api/revenue',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(revForm) })
    setShowRev(false); setSaving(false); loadAll()
  }

  async function submitFactoring() {
    if (!facForm.invoice_amount) return
    setSaving(true)
    await authFetch('/api/factoring',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(facForm) })
    setShowFac(false); setSaving(false); loadAll()
  }

  async function getAI() {
    if (!summary) return
    setAiLoading(true)
    const r = await authFetch('/api/tax',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ action:'ai_advice',summary }) })
    const d = await r.json()
    setAiAdvice(d.advice)
    setAiLoading(false)
  }

  const pm = summary?.totalRevenue > 0 ? ((summary.grossProfit/summary.totalRevenue)*100).toFixed(1) : 0
  const fs = { total:factoring.reduce((s,f)=>s+parseFloat(f.invoice_amount||0),0), advanced:factoring.reduce((s,f)=>s+parseFloat(f.advance_amount||0),0), fees:factoring.reduce((s,f)=>s+parseFloat(f.factoring_fee_amount||0),0), pending:factoring.filter(f=>f.status==='advanced').length }
  const fmt = n => `$${(n||0).toLocaleString('en',{maximumFractionDigits:0})}`

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <button onClick={()=>router.push('/admin')} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:14,cursor:'pointer',padding:0 }}>← Back</button>
            <div>
              <h1 style={{ fontSize:18,fontWeight:900,margin:0 }}>💵 Financial Center</h1>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',margin:'2px 0 0' }}>Revenue · Expenses · Taxes · Factoring</p>
            </div>
          </div>
          <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{ padding:'6px 10px',borderRadius:8,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'white',fontSize:13,outline:'none' }}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display:'flex',gap:0,overflowX:'auto' }}>
          {[['overview','📊 Overview'],['expenses','💸 Expenses'],['revenue','💰 Revenue'],['factoring','🏦 Factoring'],['taxes','📝 Taxes']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 14px',background:'none',border:'none',borderBottom:tab===k?'2px solid #2D7A5F':'2px solid transparent',color:tab===k?'#4ade80':'rgba(255,255,255,0.4)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}>{l}</button>
          ))}
        </div>
      </div>

      {tab==='overview' && (
        <div style={S.pad}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            {[
              { label:'Total Revenue',value:fmt(summary?.totalRevenue),color:'#4ade80',sub:`${year} YTD` },
              { label:'Total Expenses',value:fmt(summary?.totalExpenses),color:'#ef4444',sub:`${year} YTD` },
              { label:'Gross Profit',value:fmt(summary?.grossProfit),color:(summary?.grossProfit||0)>0?'#4ade80':'#ef4444',sub:`${pm}% margin` },
              { label:'Est. Tax Owed',value:fmt(summary?.estimatedTax),color:'#f59e0b',sub:'~25% self-employment' },
            ].map(s=>(
              <div key={s.label} style={S.card}>
                <div style={{ fontSize:22,fontWeight:900,color:s.color,lineHeight:1,marginBottom:2 }}>{s.value}</div>
                <div style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.6)' }}>{s.label}</div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.darkCard,padding:16,marginBottom:12,background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)' }}>
            <p style={{ fontWeight:800,fontSize:14,margin:'0 0 10px' }}>🏦 Factoring Summary</p>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {[{label:'Factored',value:fmt(fs.total)},{label:'Advanced',value:fmt(fs.advanced)},{label:'Pending',value:fs.pending}].map(s=>(
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18,fontWeight:900,color:'#60a5fa' }}>{s.value}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...S.darkCard,marginBottom:12 }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>📊 Expense Breakdown</p>
            </div>
            {CATS.filter(c=>(summary?.deductions?.[c.key]||0)>0).sort((a,b)=>(summary?.deductions?.[b.key]||0)-(summary?.deductions?.[a.key]||0)).map(cat=>{
              const amt = summary?.deductions?.[cat.key]||0
              const pct = summary?.totalExpenses>0?(amt/summary.totalExpenses)*100:0
              return (
                <div key={cat.key} style={{ padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                    <span style={{ fontSize:13,color:'rgba(255,255,255,0.7)' }}>{cat.icon} {cat.label}</span>
                    <span style={{ fontSize:13,fontWeight:700 }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ height:4,background:'rgba(255,255,255,0.06)',borderRadius:2 }}>
                    <div style={{ height:'100%',background:cat.color,borderRadius:2,width:`${pct}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
            <button onClick={()=>setShowExp(true)} style={{ padding:14,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:14,color:'#f87171',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Expense</button>
            <button onClick={()=>setShowRev(true)} style={{ padding:14,background:'rgba(45,122,95,0.15)',border:'1px solid rgba(45,122,95,0.25)',borderRadius:14,color:'#4ade80',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Revenue</button>
            <button onClick={()=>setShowFac(true)} style={{ padding:14,background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:14,color:'#60a5fa',fontWeight:700,fontSize:12,cursor:'pointer' }}>Factor Load</button>
          </div>
        </div>
      )}

      {tab==='expenses' && (
        <div style={S.pad}>
          <button onClick={()=>setShowExp(true)} style={{ ...S.btn,marginBottom:16 }}>+ Log Expense</button>
          {expenses.length===0?(
            <div style={{ textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize:48,marginBottom:12 }}>💸</div>
              <p>No expenses logged for {year}</p>
            </div>
          ):expenses.map(exp=>{
            const cat = CATS.find(c=>c.key===exp.category)||CATS[CATS.length-1]
            return (
              <div key={exp.id} style={{ ...S.darkCard,padding:14,marginBottom:8 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                  <div style={{ display:'flex',gap:10 }}>
                    <span style={{ fontSize:22 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700 }}>{exp.description||cat.label}</div>
                      <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{exp.vendor?`${exp.vendor} · `:''}{exp.date}</div>
                      {exp.truck_number&&<div style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>Truck #{exp.truck_number}{exp.state?` · ${exp.state}`:''}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18,fontWeight:900,color:'#ef4444' }}>-{fmt(exp.amount)}</div>
                    <div style={{ fontSize:10,padding:'2px 8px',borderRadius:4,background:`${cat.color}20`,color:cat.color,marginTop:4 }}>{cat.label}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab==='revenue' && (
        <div style={S.pad}>
          <button onClick={()=>setShowRev(true)} style={{ ...S.btn,marginBottom:16 }}>+ Log Revenue</button>
          {revenue.length===0?(
            <div style={{ textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize:48,marginBottom:12 }}>💰</div>
              <p>No revenue logged for {year}</p>
            </div>
          ):revenue.map(rev=>(
            <div key={rev.id} style={{ ...S.darkCard,padding:14,marginBottom:8 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:700 }}>{rev.description||rev.source}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{rev.broker_name?`${rev.broker_name} · `:''}{rev.date}</div>
                  {rev.origin_state&&<div style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>{rev.origin_state} → {rev.destination_state}{rev.miles?` · ${rev.miles} mi`:''}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18,fontWeight:900,color:'#4ade80' }}>{fmt(rev.amount)}</div>
                  <div style={{ fontSize:10,padding:'2px 8px',borderRadius:4,background:rev.payment_status==='paid'?'rgba(45,122,95,0.2)':'rgba(245,158,11,0.2)',color:rev.payment_status==='paid'?'#4ade80':'#f59e0b',marginTop:4 }}>{rev.payment_status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='factoring' && (
        <div style={S.pad}>
          <div style={{ ...S.darkCard,padding:16,marginBottom:16,background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)' }}>
            <p style={{ fontWeight:800,fontSize:15,margin:'0 0 4px' }}>🏦 Freight Factoring</p>
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',margin:'0 0 12px' }}>Get paid today instead of waiting 30-90 days.</p>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12 }}>
              {[{label:'Factored',value:fmt(fs.total)},{label:'Advanced',value:fmt(fs.advanced)},{label:'Fees',value:fmt(fs.fees)}].map(s=>(
                <div key={s.label} style={{ background:'rgba(255,255,255,0.05)',borderRadius:10,padding:10,textAlign:'center' }}>
                  <div style={{ fontSize:16,fontWeight:900,color:'#60a5fa' }}>{s.value}</div>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:1 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowFac(true)} style={{ width:'100%',padding:13,background:'rgba(59,130,246,0.3)',border:'1px solid rgba(59,130,246,0.4)',borderRadius:12,color:'#60a5fa',fontWeight:700,fontSize:14,cursor:'pointer' }}>+ Factor a Load</button>
          </div>
          {factoring.map(fac=>(
            <div key={fac.id} style={{ ...S.darkCard,padding:16,marginBottom:8 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:800 }}>{fac.broker_name||'Unknown Broker'}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>Pays in {fac.broker_payment_days} days · {fac.date}</div>
                </div>
                <div style={{ padding:'4px 10px',borderRadius:6,background:fac.status==='advanced'?'rgba(59,130,246,0.2)':fac.status==='complete'?'rgba(45,122,95,0.2)':'rgba(245,158,11,0.2)',color:fac.status==='advanced'?'#60a5fa':fac.status==='complete'?'#4ade80':'#f59e0b',fontSize:11,fontWeight:700,height:'fit-content' }}>{fac.status.toUpperCase()}</div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {[{label:'Invoice',value:fmt(fac.invoice_amount)},{label:`${fac.advance_rate}% Advance`,value:fmt(fac.advance_amount),color:'#4ade80'},{label:`${fac.factoring_fee_pct}% Fee`,value:fmt(fac.factoring_fee_amount),color:'#ef4444'}].map(s=>(
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.04)',borderRadius:8,padding:8,textAlign:'center' }}>
                    <div style={{ fontSize:14,fontWeight:800,color:s.color||'white' }}>{s.value}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {factoring.length===0&&<div style={{ textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)' }}><div style={{ fontSize:48,marginBottom:12 }}>🏦</div><p>No factoring records yet.</p></div>}
        </div>
      )}

      {tab==='taxes' && (
        <div style={S.pad}>
          <div style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.03))',border:'1px solid rgba(245,158,11,0.2)',borderRadius:20,padding:20,marginBottom:16,textAlign:'center' }}>
            <p style={{ fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:2,textTransform:'uppercase',marginBottom:8 }}>{year} Tax Summary</p>
            <div style={{ fontSize:48,fontWeight:900,color:'#f59e0b',lineHeight:1 }}>{fmt(summary?.estimatedTax)}</div>
            <div style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:4,marginBottom:20 }}>Estimated Tax Owed</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8 }}>
              {[{label:'Gross Revenue',value:fmt(summary?.totalRevenue),color:'#4ade80'},{label:'Total Deductions',value:fmt(summary?.totalDeductions),color:'#60a5fa'},{label:'Taxable Income',value:fmt(summary?.taxableIncome),color:'#f59e0b'},{label:'You Save',value:fmt((summary?.totalRevenue||0)-(summary?.taxableIncome||0)),color:'#4ade80'}].map(s=>(
                <div key={s.label} style={{ background:'rgba(255,255,255,0.05)',borderRadius:12,padding:12 }}>
                  <div style={{ fontSize:18,fontWeight:900,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...S.darkCard,marginBottom:16 }}>
            <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight:800,fontSize:14,margin:0 }}>✅ Your Tax Deductions</p>
            </div>
            {[{label:'⛽ Fuel',key:'fuel'},{label:'🔧 Maintenance',key:'maintenance'},{label:'🛡️ Insurance',key:'insurance'},{label:'📋 Permits',key:'permits'},{label:'🛞 Tires',key:'tires'},{label:'🏨 Per Diem ($69/day)',key:'per_diem'},{label:'📱 ELD & Software',key:'eld'},{label:'🛣️ Tolls',key:'tolls'},{label:'📦 Other',key:'other'}].map(item=>{
              const amt = summary?.deductions?.[item.key]||0
              if (amt===0) return null
              return (
                <div key={item.key} style={S.row}>
                  <span style={{ fontSize:13,color:'rgba(255,255,255,0.6)' }}>{item.label}</span>
                  <span style={{ fontSize:14,fontWeight:700,color:'#60a5fa' }}>{fmt(amt)}</span>
                </div>
              )
            })}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'rgba(96,165,250,0.08)' }}>
              <span style={{ fontSize:14,fontWeight:800 }}>Total Deductions</span>
              <span style={{ fontSize:18,fontWeight:900,color:'#60a5fa' }}>{fmt(summary?.totalDeductions)}</span>
            </div>
          </div>

          <button onClick={getAI} disabled={aiLoading} style={{ width:'100%',padding:16,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',border:'none',borderRadius:16,color:'white',fontSize:15,fontWeight:800,cursor:'pointer',marginBottom:12,opacity:aiLoading?0.7:1 }}>
            {aiLoading?'🤖 Analyzing...':'🤖 AI Tax Advisor — Maximize My Deductions'}
          </button>

          {aiAdvice&&(
            <div style={{ background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:16,padding:16,marginBottom:16 }}>
              <div style={{ display:'flex',gap:10,marginBottom:8 }}><span style={{ fontSize:20 }}>🤖</span><span style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1 }}>AI Tax Advisor</span></div>
              <p style={{ fontSize:14,lineHeight:1.75,color:'rgba(255,255,255,0.8)',margin:0,whiteSpace:'pre-wrap' }}>{aiAdvice}</p>
            </div>
          )}

          <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',padding:14,fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.7 }}>
            ⚠️ Estimate for planning only. Consult a licensed CPA for actual filing. TruckSuperSoftware organizes your records to make that conversation fast and cheap.
          </div>
        </div>
      )}

      {showExp&&(
        <div style={S.modal} onClick={()=>setShowExp(false)}>
          <div style={S.modalInner} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:18,fontWeight:900,margin:0 }}>💸 Log Expense</h3>
              <button onClick={()=>setShowExp(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:22,cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <input type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))} style={S.input}/>
              <select value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))} style={S.input}>
                {CATS.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
              <input type="number" placeholder="Amount ($) *" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} style={S.input}/>
              <input placeholder="Description" value={expForm.description} onChange={e=>setExpForm(f=>({...f,description:e.target.value}))} style={S.input}/>
              <input placeholder="Vendor / Merchant" value={expForm.vendor} onChange={e=>setExpForm(f=>({...f,vendor:e.target.value}))} style={S.input}/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <input placeholder="Truck #" value={expForm.truck_number} onChange={e=>setExpForm(f=>({...f,truck_number:e.target.value}))} style={S.input}/>
                <input placeholder="State (IFTA)" value={expForm.state} onChange={e=>setExpForm(f=>({...f,state:e.target.value}))} style={S.input}/>
              </div>
              {expForm.category==='fuel'&&<input type="number" placeholder="Gallons (IFTA)" value={expForm.gallons} onChange={e=>setExpForm(f=>({...f,gallons:e.target.value}))} style={S.input}/>}
              <button onClick={addExpense} disabled={saving} style={{ ...S.btn,opacity:saving?0.6:1 }}>{saving?'Saving...':'💸 Log Expense'}</button>
            </div>
          </div>
        </div>
      )}

      {showRev&&(
        <div style={S.modal} onClick={()=>setShowRev(false)}>
          <div style={S.modalInner} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:18,fontWeight:900,margin:0 }}>💰 Log Revenue</h3>
              <button onClick={()=>setShowRev(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:22,cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <input type="date" value={revForm.date} onChange={e=>setRevForm(f=>({...f,date:e.target.value}))} style={S.input}/>
              <select value={revForm.source} onChange={e=>setRevForm(f=>({...f,source:e.target.value}))} style={S.input}>
                {[['load','Load Revenue'],['detention','Detention Pay'],['fuel_surcharge','Fuel Surcharge'],['factoring','Factoring Advance'],['other','Other']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <input type="number" placeholder="Amount ($) *" value={revForm.amount} onChange={e=>setRevForm(f=>({...f,amount:e.target.value}))} style={S.input}/>
              <input placeholder="Description" value={revForm.description} onChange={e=>setRevForm(f=>({...f,description:e.target.value}))} style={S.input}/>
              <input placeholder="Broker / Shipper" value={revForm.broker_name} onChange={e=>setRevForm(f=>({...f,broker_name:e.target.value}))} style={S.input}/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                <input placeholder="Miles" type="number" value={revForm.miles} onChange={e=>setRevForm(f=>({...f,miles:e.target.value}))} style={S.input}/>
                <input placeholder="From" value={revForm.origin_state} onChange={e=>setRevForm(f=>({...f,origin_state:e.target.value}))} style={S.input}/>
                <input placeholder="To" value={revForm.destination_state} onChange={e=>setRevForm(f=>({...f,destination_state:e.target.value}))} style={S.input}/>
              </div>
              <select value={revForm.payment_status} onChange={e=>setRevForm(f=>({...f,payment_status:e.target.value}))} style={S.input}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="factored">Factored</option>
                <option value="overdue">Overdue</option>
              </select>
              <button onClick={addRevenue} disabled={saving} style={{ ...S.btn,opacity:saving?0.6:1 }}>{saving?'Saving...':'💰 Log Revenue'}</button>
            </div>
          </div>
        </div>
      )}

      {showFac&&(
        <div style={S.modal} onClick={()=>setShowFac(false)}>
          <div style={{ ...S.modalInner,maxHeight:'70vh' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
              <h3 style={{ fontSize:18,fontWeight:900,margin:0 }}>🏦 Factor This Load</h3>
              <button onClick={()=>setShowFac(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:22,cursor:'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:16 }}>Get paid today. We advance {facForm.advance_rate}% immediately.</p>
            {facForm.invoice_amount&&(
              <div style={{ background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:14,padding:16,marginBottom:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center' }}>
                {[{label:'You Get Today',value:fmt(parseFloat(facForm.invoice_amount)*parseFloat(facForm.advance_rate)/100),color:'#4ade80'},{label:'Fee',value:fmt(parseFloat(facForm.invoice_amount)*parseFloat(facForm.factoring_fee_pct)/100),color:'#ef4444'},{label:'Reserve',value:fmt(parseFloat(facForm.invoice_amount)*(100-parseFloat(facForm.advance_rate)-parseFloat(facForm.factoring_fee_pct))/100),color:'#f59e0b'}].map(s=>(
                  <div key={s.label}><div style={{ fontSize:20,fontWeight:900,color:s.color }}>{s.value}</div><div style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>{s.label}</div></div>
                ))}
              </div>
            )}
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <input type="number" placeholder="Invoice Amount ($) *" value={facForm.invoice_amount} onChange={e=>setFacForm(f=>({...f,invoice_amount:e.target.value}))} style={S.input}/>
              <input placeholder="Broker Name" value={facForm.broker_name} onChange={e=>setFacForm(f=>({...f,broker_name:e.target.value}))} style={S.input}/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                {[['advance_rate','Advance %'],['factoring_fee_pct','Fee %'],['broker_payment_days','Days to Pay']].map(([k,l])=>(
                  <div key={k}>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:4 }}>{l}</div>
                    <input type="number" value={facForm[k]} onChange={e=>setFacForm(f=>({...f,[k]:e.target.value}))} style={S.input}/>
                  </div>
                ))}
              </div>
              <button onClick={submitFactoring} disabled={saving} style={{ ...S.btn,background:'rgba(59,130,246,0.4)',border:'1px solid rgba(59,130,246,0.5)',opacity:saving?0.6:1 }}>{saving?'Submitting...':'🏦 Submit for Factoring'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

