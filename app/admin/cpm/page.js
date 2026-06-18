'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const DEFAULT_COSTS = {
  truck_payment: 2200, trailer_payment: 800, insurance: 1200,
  permits_licenses: 150, eld_subscription: 45, other_fixed: 200,
  maintenance_per_mile: 0.18, tires_per_mile: 0.06,
  driver_pay_per_mile: 0.55, other_variable: 0.05,
  diesel_price: 4.85, truck_mpg: 6.5,
  miles_per_month: 10000, revenue_per_mile: 2.10,
  num_trucks: 1,
}

function Gauge({ value, max, color, label, sublabel }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
        <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 2.01} 201`} strokeLinecap="round"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{sublabel}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

export default function CostPerMile() {
  const router = useRouter()
  const [costs, setCosts] = useState(DEFAULT_COSTS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAdvice, setAiAdvice] = useState(null)
  const [laneHistory, setLaneHistory] = useState([
    { from: 'Dallas, TX', to: 'Los Angeles, CA', miles: 1432, rate: 3200, date: '2026-06-10' },
    { from: 'Oklahoma City, OK', to: 'Houston, TX', miles: 450, rate: 890, date: '2026-06-08' },
    { from: 'Bakersfield, CA', to: 'Phoenix, AZ', miles: 340, rate: 720, date: '2026-06-05' },
  ])
  const [load, setLoad] = useState({
    miles: 500, deadhead_miles: 75, rate: 1200,
    detention: 0, tolls: 0,
    broker_name: '', broker_days_to_pay: 30, broker_credit: 85,
    market_rate_per_mile: 2.35,
    origin: '', destination: '',
  })

  useEffect(() => {
    const s = localStorage.getItem('tss_cpm_costs')
    if (s) setCosts(JSON.parse(s))
    const l = localStorage.getItem('tss_lane_history')
    if (l) setLaneHistory(JSON.parse(l))
  }, [])

  function saveCosts() {
    localStorage.setItem('tss_cpm_costs', JSON.stringify(costs))
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function update(key, val) { setCosts(c => ({ ...c, [key]: parseFloat(val) || 0 })) }
  function updateLoad(key, val) { setLoad(l => ({ ...l, [key]: val })) }

  function saveLane() {
    if (!load.origin || !load.destination || !load.miles) return
    const newLane = { from: load.origin, to: load.destination, miles: parseFloat(load.miles), rate: parseFloat(load.rate), date: new Date().toISOString().split('T')[0] }
    const updated = [newLane, ...laneHistory.slice(0, 19)]
    setLaneHistory(updated)
    localStorage.setItem('tss_lane_history', JSON.stringify(updated))
  }

  // Core calculations
  const fuel_per_mile = costs.diesel_price / costs.truck_mpg
  const totalFixed = costs.truck_payment + costs.trailer_payment + costs.insurance + costs.permits_licenses + costs.eld_subscription + costs.other_fixed
  const fixedPerMile = costs.miles_per_month > 0 ? totalFixed / costs.miles_per_month : 0
  const totalVariablePerMile = fuel_per_mile + costs.maintenance_per_mile + costs.tires_per_mile + costs.driver_pay_per_mile + costs.other_variable
  const totalCPM = fixedPerMile + totalVariablePerMile
  const rpm = costs.revenue_per_mile
  const profitPerMile = rpm - totalCPM
  const monthlyRevenue = rpm * costs.miles_per_month
  const monthlyProfit = profitPerMile * costs.miles_per_month
  const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0
  const breakEvenMiles = totalFixed > 0 ? totalFixed / Math.max(0.001, rpm - totalVariablePerMile) : 0
  const weeklyProfitPerTruck = (monthlyProfit / 4.33) / Math.max(1, costs.num_trucks)
  const annualRevenue = monthlyRevenue * 12
  const annualProfit = monthlyProfit * 12
  const profitPerTruck = monthlyProfit / Math.max(1, costs.num_trucks)

  // Load analysis
  const totalLoadMiles = parseFloat(load.miles) + parseFloat(load.deadhead_miles || 0)
  const loadRevenue = parseFloat(load.rate) + parseFloat(load.detention || 0)
  const loadFuelCost = totalLoadMiles * fuel_per_mile
  const loadTotalCost = totalCPM * totalLoadMiles + parseFloat(load.tolls || 0)
  const loadProfit = loadRevenue - loadTotalCost
  const trueRPM = totalLoadMiles > 0 ? loadRevenue / totalLoadMiles : 0
  const loadedRPM = parseFloat(load.miles) > 0 ? loadRevenue / parseFloat(load.miles) : 0
  const marketRate = parseFloat(load.market_rate_per_mile) || 0
  const vsMarket = loadedRPM - marketRate
  const brokerRisk = parseFloat(load.broker_days_to_pay) > 45 ? 'HIGH' : parseFloat(load.broker_days_to_pay) > 30 ? 'MEDIUM' : 'LOW'
  const brokerRiskColor = brokerRisk === 'HIGH' ? '#ef4444' : brokerRisk === 'MEDIUM' ? '#f59e0b' : '#4ade80'

  const profitScore = loadProfit > 600 ? 95 : loadProfit > 400 ? 80 : loadProfit > 200 ? 65 : loadProfit > 0 ? 45 : 10
  const riskScore = brokerRisk === 'LOW' ? 85 : brokerRisk === 'MEDIUM' ? 60 : 30
  const overallScore = Math.round((profitScore * 0.6) + (riskScore * 0.4))
  const overallGrade = overallScore >= 80 ? 'A' : overallScore >= 65 ? 'B' : overallScore >= 50 ? 'C' : 'F'
  const gradeColor = overallGrade === 'A' ? '#4ade80' : overallGrade === 'B' ? '#f59e0b' : overallGrade === 'C' ? '#fb923c' : '#ef4444'

  const healthColor = profitMargin >= 10 ? '#4ade80' : profitMargin >= 5 ? '#f59e0b' : '#ef4444'
  const healthLabel = profitMargin >= 10 ? 'HEALTHY' : profitMargin >= 5 ? 'TIGHT' : profitMargin >= 0 ? 'BREAK EVEN' : 'LOSING MONEY'

  async function getAIAdvice() {
    setAiLoading(true); setAiAdvice(null)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze this trucking load and give a 3-sentence recommendation:
Load: ${load.origin || 'Unknown'} → ${load.destination || 'Unknown'}
Miles: ${load.miles} loaded + ${load.deadhead_miles} deadhead = ${totalLoadMiles} total
Rate: $${load.rate} ($${loadedRPM.toFixed(2)}/loaded mi, $${trueRPM.toFixed(2)}/true mi)
Our CPM: $${totalCPM.toFixed(3)}
Load Profit: $${loadProfit.toFixed(0)}
Broker: ${load.broker_name || 'Unknown'}, pays in ${load.broker_days_to_pay} days, credit score ${load.broker_credit}
Market rate for this lane: $${marketRate}/mi
Be direct. Start with ACCEPT or DECLINE. Then explain why in 2 sentences.`,
          role: 'admin'
        })
      })
      const data = await res.json()
      setAiAdvice(data.reply || data.message || data.content || 'Unable to analyze at this time.')
    } catch { setAiAdvice('AI advisor unavailable. Check your data and decide based on profit score.') }
    setAiLoading(false)
  }

  // Lane intelligence
  const laneKey = (from, to) => `${from?.split(',')[0]}→${to?.split(',')[0]}`
  const matchingLanes = laneHistory.filter(l =>
    load.origin && load.destination &&
    (l.from?.toLowerCase().includes(load.origin?.split(',')[0]?.toLowerCase()) ||
     l.to?.toLowerCase().includes(load.destination?.split(',')[0]?.toLowerCase()))
  )
  const avgLaneRate = matchingLanes.length > 0 ?
    matchingLanes.reduce((s,l) => s + (l.rate / l.miles), 0) / matchingLanes.length : 0

  return (
    <div style={{ minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system, sans-serif', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628, #0d2137)', padding: '20px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', padding: 0 }}>← Back</button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>💰 Profit Command Center</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Know your numbers. Run a profitable fleet.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {[['calculator','📊 Fleet'],['load','🚛 Load AI'],['lanes','🗺️ Lanes'],['forecast','📈 Forecast']].map(([key,label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: activeTab === key ? '2px solid #2D7A5F' : '2px solid transparent', color: activeTab === key ? '#4ade80' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* FLEET TAB */}
      {activeTab === 'calculator' && (
        <div style={{ padding: 16 }}>

          {/* Visual Gauges */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', padding: '20px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 16 }}>Fleet Health</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              <Gauge value={profitMargin} max={20} color={healthColor} label="Margin" sublabel={`${profitMargin.toFixed(0)}%`} />
              <Gauge value={Math.min(rpm, 3)} max={3} color="#4ade80" label="Rev/Mi" sublabel={`$${rpm.toFixed(2)}`} />
              <Gauge value={Math.min(totalCPM, 3)} max={3} color="#ef4444" label="CPM" sublabel={`$${totalCPM.toFixed(2)}`} />
              <Gauge value={profitPerMile > 0 ? Math.min(profitPerMile, 1) : 0} max={1} color={profitPerMile > 0 ? '#4ade80' : '#ef4444'} label="Profit/Mi" sublabel={`$${profitPerMile.toFixed(2)}`} />
            </div>
          </div>

          {/* Key Numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Monthly Revenue', value: `$${monthlyRevenue.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#4ade80', sub: `${costs.miles_per_month.toLocaleString()} miles` },
              { label: 'Monthly Profit', value: `$${monthlyProfit.toLocaleString('en',{maximumFractionDigits:0})}`, color: monthlyProfit > 0 ? '#4ade80' : '#ef4444', sub: `${profitMargin.toFixed(1)}% margin` },
              { label: 'Profit / Truck', value: `$${profitPerTruck.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#f59e0b', sub: `${costs.num_trucks} truck${costs.num_trucks > 1 ? 's' : ''}` },
              { label: 'Weekly / Truck', value: `$${weeklyProfitPerTruck.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#60a5fa', sub: 'per truck per week' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: -1, lineHeight: 1, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Fuel Section */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
              <div><p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>⛽ Fuel Calculator</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Auto-calculates from diesel price + MPG</p></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>${fuel_per_mile.toFixed(3)}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>per mile</div></div>
            </div>
            {[['diesel_price','Diesel Price ($/gal)','0.01'],['truck_mpg','Truck MPG','0.1']].map(([key,label,step]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                <input type="number" step={step} value={costs[key]} onChange={e => update(key, e.target.value)}
                  style={{ width: 90, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right' }} />
              </div>
            ))}
            <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>At ${costs.diesel_price}/gal ÷ {costs.truck_mpg} MPG</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>${fuel_per_mile.toFixed(3)}/mi fuel cost</span>
            </div>
          </div>

          {/* Fixed + Variable + Fleet size */}
          {[
            { title: '📌 Fixed Monthly', sub: 'Same regardless of miles', total: `$${totalFixed.toLocaleString()}`, totalSub: `$${fixedPerMile.toFixed(3)}/mi`, color: '#ef4444', fields: [['truck_payment','Truck Payment'],['trailer_payment','Trailer Payment'],['insurance','Insurance'],['permits_licenses','Permits & Licenses'],['eld_subscription','ELD/Software'],['other_fixed','Other Fixed']] },
            { title: '⚡ Variable Per Mile', sub: 'Changes with miles driven', total: `$${totalVariablePerMile.toFixed(3)}`, totalSub: 'per mile', color: '#f59e0b', fields: [['maintenance_per_mile','Maintenance'],['tires_per_mile','Tires'],['driver_pay_per_mile','Driver Pay'],['other_variable','Other']] },
          ].map(section => (
            <div key={section.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div><p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>{section.title}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{section.sub}</p></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 900, color: section.color }}>{section.total}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{section.totalSub}</div></div>
              </div>
              {section.fields.map(([key, label]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <input type="number" step="0.01" value={costs[key]} onChange={e => update(key, e.target.value)}
                    style={{ width: 90, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right' }} />
                </div>
              ))}
            </div>
          ))}

          {/* Revenue + Fleet */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}><p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>📈 Revenue & Fleet</p></div>
            {[['revenue_per_mile','Revenue Per Mile','0.01'],['miles_per_month','Miles Per Month','100'],['num_trucks','Number of Trucks','1']].map(([key,label,step]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                <input type="number" step={step} value={costs[key]} onChange={e => update(key, e.target.value)}
                  style={{ width: 110, padding: '8px 12px', borderRadius: 10, background: 'rgba(45,122,95,0.15)', border: '1px solid rgba(45,122,95,0.3)', color: '#4ade80', fontSize: 15, fontWeight: 800, outline: 'none', textAlign: 'right' }} />
              </div>
            ))}
          </div>

          <button onClick={saveCosts} style={{ width: '100%', padding: 16, background: saved ? 'rgba(45,122,95,0.3)' : '#2D7A5F', border: 'none', borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            {saved ? '✅ Saved!' : '💾 Save My Numbers'}
          </button>
        </div>
      )}

      {/* LOAD AI TAB */}
      {activeTab === 'load' && (
        <div style={{ padding: 16 }}>

          {/* Load Inputs */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>🚛 Load Details</p>
            </div>
            {[
              ['origin','Origin City, State','text'],['destination','Destination City, State','text'],
              ['miles','Loaded Miles','number'],['deadhead_miles','Deadhead Miles','number'],
              ['rate','Gross Rate ($)','number'],['market_rate_per_mile','Market Rate ($/mi)','number'],
              ['detention','Detention Pay ($)','number'],['tolls','Tolls ($)','number'],
            ].map(([key,placeholder,type]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{placeholder}</span>
                <input type={type} placeholder={placeholder} value={load[key]}
                  onChange={e => updateLoad(key, e.target.value)}
                  style={{ width: 130, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right' }} />
              </div>
            ))}
          </div>

          {/* Broker Info */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>🏦 Broker Credit</p>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: brokerRisk === 'LOW' ? 'rgba(45,122,95,0.2)' : brokerRisk === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: brokerRiskColor, fontWeight: 700 }}>{brokerRisk} RISK</span>
            </div>
            {[['broker_name','Broker Name','text'],['broker_days_to_pay','Days To Pay','number'],['broker_credit','Credit Score (0-100)','number']].map(([key,label,type]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <input type={type} placeholder={label} value={load[key]} onChange={e => updateLoad(key, e.target.value)}
                  style={{ width: 130, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right' }} />
              </div>
            ))}
          </div>

          {/* Score Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              <Gauge value={profitScore} max={100} color={profitScore >= 70 ? '#4ade80' : profitScore >= 50 ? '#f59e0b' : '#ef4444'} label="Profit" sublabel={`${profitScore}`} />
              <Gauge value={riskScore} max={100} color={riskScore >= 70 ? '#4ade80' : riskScore >= 50 ? '#f59e0b' : '#ef4444'} label="Risk" sublabel={`${riskScore}`} />
              <Gauge value={overallScore} max={100} color={gradeColor} label="Overall" sublabel={overallGrade} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[
                { label: 'Loaded RPM', value: `$${loadedRPM.toFixed(2)}`, color: loadedRPM > totalCPM ? '#4ade80' : '#ef4444' },
                { label: 'True RPM', value: `$${trueRPM.toFixed(2)}`, color: trueRPM > totalCPM ? '#4ade80' : '#ef4444', sub: 'incl. deadhead' },
                { label: 'Net Profit', value: `$${loadProfit.toFixed(0)}`, color: loadProfit > 0 ? '#4ade80' : '#ef4444' },
                { label: 'vs Market', value: vsMarket >= 0 ? `+$${vsMarket.toFixed(2)}/mi` : `-$${Math.abs(vsMarket).toFixed(2)}/mi`, color: vsMarket >= 0 ? '#4ade80' : '#ef4444', sub: vsMarket >= 0 ? 'ABOVE MARKET' : 'BELOW MARKET' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</div>
                  {s.sub && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Deadhead breakdown */}
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Loaded Miles</span><span style={{ fontWeight: 700, color: 'white' }}>{load.miles} mi</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Deadhead Miles</span><span style={{ fontWeight: 700, color: '#f59e0b' }}>{load.deadhead_miles} mi</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 4 }}>
                <span>Total Miles</span><span style={{ fontWeight: 700, color: 'white' }}>{totalLoadMiles} mi</span>
              </div>
            </div>

            {/* vs Market */}
            {marketRate > 0 && (
              <div style={{ marginTop: 10, padding: 12, background: vsMarket >= 0 ? 'rgba(45,122,95,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 10, border: `1px solid ${vsMarket >= 0 ? 'rgba(45,122,95,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Market Rate Check</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>This Load</div><div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>${loadedRPM.toFixed(2)}/mi</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>DIFFERENCE</div><div style={{ fontSize: 18, fontWeight: 900, color: gradeColor }}>{vsMarket >= 0 ? '+' : ''}${(vsMarket * parseFloat(load.miles)).toFixed(0)}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Market</div><div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>${marketRate.toFixed(2)}/mi</div></div>
                </div>
              </div>
            )}
          </div>

          {/* AI Advisor */}
          <button onClick={getAIAdvice} disabled={aiLoading}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 12, opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? '🤖 Analyzing...' : '🤖 AI Load Advisor — Should I Take This?'}
          </button>

          {aiAdvice && (
            <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>AI Dispatch Advisor</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{aiAdvice}</p>
            </div>
          )}

          <button onClick={saveLane} style={{ width: '100%', padding: 14, background: 'rgba(45,122,95,0.2)', border: '1px solid rgba(45,122,95,0.3)', borderRadius: 16, color: '#4ade80', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            💾 Save to Lane History
          </button>
        </div>
      )}

      {/* LANES TAB */}
      {activeTab === 'lanes' && (
        <div style={{ padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: 16, marginBottom: 16 }}>
            <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>🗺️ Lane Intelligence</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Your historical rates by lane. Smarter than any load board.</p>
          </div>
          {laneHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
              <p>No lane history yet. Analyze loads and save them to build your lane database.</p>
            </div>
          ) : laneHistory.map((lane, i) => {
            const laneRPM = lane.rate / lane.miles
            const profit = lane.rate - (totalCPM * lane.miles)
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{lane.from}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>→ {lane.to}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: profit > 0 ? '#4ade80' : '#ef4444' }}>${profit.toFixed(0)}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>net profit</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Miles', value: lane.miles.toLocaleString() },
                    { label: 'Rate', value: `$${lane.rate.toLocaleString()}` },
                    { label: '$/mi', value: `$${laneRPM.toFixed(2)}` },
                    { label: 'Date', value: lane.date },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FORECAST TAB */}
      {activeTab === 'forecast' && (
        <div style={{ padding: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(45,122,95,0.12), rgba(45,122,95,0.04))', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Annual Business Forecast</p>
            <div style={{ fontSize: 52, fontWeight: 900, color: annualProfit > 0 ? '#4ade80' : '#ef4444', letterSpacing: -2, lineHeight: 1 }}>
              ${Math.abs(annualProfit).toLocaleString('en',{maximumFractionDigits:0})}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {annualProfit > 0 ? 'Projected Annual Profit' : 'Projected Annual Loss'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Annual Revenue', value: `$${annualRevenue.toLocaleString('en',{maximumFractionDigits:0})}`, color: '#4ade80', sub: `${(costs.miles_per_month * 12).toLocaleString()} miles/year` },
              { label: 'Annual Costs', value: `$${(annualRevenue - annualProfit).toLocaleString('en',{maximumFractionDigits:0})}`, color: '#ef4444', sub: `$${totalCPM.toFixed(3)} CPM × ${(costs.miles_per_month * 12).toLocaleString()} mi` },
              { label: 'Annual Profit', value: `$${annualProfit.toLocaleString('en',{maximumFractionDigits:0})}`, color: annualProfit > 0 ? '#4ade80' : '#ef4444', sub: `${profitMargin.toFixed(1)}% net margin` },
              { label: 'Per Truck Per Year', value: `$${(annualProfit / Math.max(1, costs.num_trucks)).toLocaleString('en',{maximumFractionDigits:0})}`, color: '#60a5fa', sub: `across ${costs.num_trucks} truck${costs.num_trucks > 1 ? 's' : ''}` },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.sub}</div></div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Growth scenarios */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>📈 Growth Scenarios</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>What happens if you scale?</p>
            </div>
            {[
              { trucks: 1, label: '1 Truck (Current)' },
              { trucks: 3, label: '3 Trucks' },
              { trucks: 5, label: '5 Trucks' },
              { trucks: 10, label: '10 Trucks' },
              { trucks: 25, label: '25 Trucks' },
            ].map(scenario => {
              const scenarioProfit = monthlyProfit * scenario.trucks
              const scenarioAnnual = scenarioProfit * 12
              return (
                <div key={scenario.trucks} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: scenario.trucks === costs.num_trucks ? 'rgba(45,122,95,0.08)' : 'transparent' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: scenario.trucks === costs.num_trucks ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>{scenario.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>${monthlyRevenue.toLocaleString('en',{maximumFractionDigits:0})}/mo × {scenario.trucks} trucks</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: scenarioAnnual > 0 ? '#4ade80' : '#ef4444' }}>${Math.abs(scenarioAnnual).toLocaleString('en',{maximumFractionDigits:0})}/yr</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>${Math.abs(scenarioProfit).toLocaleString('en',{maximumFractionDigits:0})}/mo</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
