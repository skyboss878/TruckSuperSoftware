'use client'
import { authFetch } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const EQUIPMENT_TYPES = ['dry_van','flatbed','reefer','tanker','step_deck','lowboy','box_truck','sprinter']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function LoadBoard() {
  const router = useRouter()
  const [loads, setLoads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ state: '', equipment: '', search: '' })
  const [showPost, setShowPost] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [verifyDot, setVerifyDot] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [posting, setPosting] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState(null)
  const [form, setForm] = useState({
    company_name: '', contact_phone: '', title: '', load_type: 'full_truckload',
    equipment_type: 'dry_van', weight_lbs: '', commodity: '',
    pickup_location: '', pickup_city: '', pickup_state: '', pickup_date: '',
    delivery_location: '', delivery_city: '', delivery_state: '', delivery_date: '',
    flat_rate: '', rate_per_mile: '', estimated_miles: '', rate_negotiable: true,
    special_instructions: ''
  })

  useEffect(() => { loadLoads() }, [filter.state, filter.equipment])

  async function loadLoads() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.state) params.append('state', filter.state)
    if (filter.equipment) params.append('equipment', filter.equipment)
    const data = await authFetch(`/api/loads?${params}`).then(r => r.json())
    setLoads(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function postLoad() {
    if (!form.company_name || !form.title || !form.pickup_location || !form.delivery_location || !form.pickup_date) return
    setPosting(true)
    await authFetch('/api/loads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowPost(false)
    setPosting(false)
    loadLoads()
  }

  async function verifyCarrier() {
    if (!verifyDot) return
    setVerifying(true)
    const data = await authFetch(`/api/verify-carrier?dot=${verifyDot}`).then(r => r.json())
    setVerifyResult(data)
    setVerifying(false)
  }

  async function claimLoad(load) {
    await authFetch('/api/loads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: load.id, status: 'claimed' })
    })
    loadLoads()
    setSelectedLoad(null)
  }

  const filtered = loads.filter(l =>
    !filter.search ||
    l.title?.toLowerCase().includes(filter.search.toLowerCase()) ||
    l.pickup_city?.toLowerCase().includes(filter.search.toLowerCase()) ||
    l.delivery_city?.toLowerCase().includes(filter.search.toLowerCase()) ||
    l.commodity?.toLowerCase().includes(filter.search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050c14', color: 'white', fontFamily: '-apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628, #0d2137)', padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>🚛 Load Board</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', letterSpacing: 1, textTransform: 'uppercase' }}>TruckSuperSoftware</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowVerify(true)}
              style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              🔍 Verify DOT
            </button>
            <button onClick={() => setShowPost(true)}
              style={{ padding: '8px 14px', borderRadius: 10, background: '#2D7A5F', border: 'none', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              + Post Load
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Open Loads', value: loads.length, icon: '📋' },
            { label: 'States', value: [...new Set(loads.map(l=>l.pickup_state))].filter(Boolean).length, icon: '🗺️' },
            { label: 'Avg Rate/Mi', value: '$'+(loads.filter(l=>l.rate_per_mile).reduce((s,l)=>s+parseFloat(l.rate_per_mile||0),0)/Math.max(loads.filter(l=>l.rate_per_mile).length,1)).toFixed(2), icon: '💰' }
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <input value={filter.search} onChange={e => setFilter(f=>({...f,search:e.target.value}))}
          placeholder="Search loads, cities, commodity..."
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          <select value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}
            style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, outline: 'none', flexShrink: 0 }}>
            <option value="">All States</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.equipment} onChange={e=>setFilter(f=>({...f,equipment:e.target.value}))}
            style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, outline: 'none', flexShrink: 0 }}>
            <option value="">All Equipment</option>
            {EQUIPMENT_TYPES.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
          </select>
          <button onClick={loadLoads} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(45,122,95,0.2)', border: '1px solid rgba(45,122,95,0.3)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Load List */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 10, width: '60%' }} />
              <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, width: '40%' }} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 600 }}>No loads posted yet</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 4 }}>Be the first to post a load</p>
            <button onClick={() => setShowPost(true)}
              style={{ marginTop: 20, padding: '12px 28px', background: '#2D7A5F', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Post First Load
            </button>
          </div>
        ) : filtered.map(load => (
          <div key={load.id} onClick={() => setSelectedLoad(load)}
            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{load.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{load.company_name}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                {load.flat_rate ? (
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>${parseInt(load.flat_rate).toLocaleString()}</div>
                ) : load.rate_per_mile ? (
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>${load.rate_per_mile}<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mi</span></div>
                ) : (
                  <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>Negotiable</div>
                )}
              </div>
            </div>

            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, background: 'rgba(45,122,95,0.1)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(45,122,95,0.2)' }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 2px' }}>Pickup</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{load.pickup_city}, {load.pickup_state}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{load.pickup_date}</p>
              </div>
              <div style={{ fontSize: 18 }}>→</div>
              <div style={{ flex: 1, background: 'rgba(59,130,246,0.08)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(59,130,246,0.15)' }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 2px' }}>Delivery</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{load.delivery_city}, {load.delivery_state}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{load.delivery_date || 'Flexible'}</p>
              </div>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                🚛 {load.equipment_type?.replace('_',' ')}
              </span>
              {load.estimated_miles && (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  📍 {load.estimated_miles} mi
                </span>
              )}
              {load.weight_lbs && (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  ⚖️ {load.weight_lbs?.toLocaleString()} lbs
                </span>
              )}
              {load.commodity && (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  📦 {load.commodity}
                </span>
              )}
              {load.hazmat_required && (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700 }}>
                  ☢️ HAZMAT
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load Detail Modal */}
      {selectedLoad && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedLoad(null)}>
          <div style={{ background: '#0d1117', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>{selectedLoad.title}</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{selectedLoad.company_name}</p>
              </div>
              <button onClick={() => setSelectedLoad(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Rate */}
            <div style={{ background: 'rgba(45,122,95,0.1)', borderRadius: 16, padding: 20, border: '1px solid rgba(45,122,95,0.2)', marginBottom: 16, textAlign: 'center' }}>
              {selectedLoad.flat_rate ? (
                <>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#4ade80' }}>${parseInt(selectedLoad.flat_rate).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Flat Rate</div>
                  {selectedLoad.estimated_miles && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>${(selectedLoad.flat_rate/selectedLoad.estimated_miles).toFixed(2)}/mi effective</div>}
                </>
              ) : selectedLoad.rate_per_mile ? (
                <>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#4ade80' }}>${selectedLoad.rate_per_mile}/mi</div>
                  {selectedLoad.estimated_miles && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Est. ${(selectedLoad.rate_per_mile * selectedLoad.estimated_miles).toLocaleString()} total</div>}
                </>
              ) : (
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>Rate Negotiable</div>
              )}
            </div>

            {/* Details */}
            {[
              ['Pickup', `${selectedLoad.pickup_location || selectedLoad.pickup_city+', '+selectedLoad.pickup_state} — ${selectedLoad.pickup_date}`],
              ['Delivery', `${selectedLoad.delivery_location || selectedLoad.delivery_city+', '+selectedLoad.delivery_state}${selectedLoad.delivery_date ? ' — '+selectedLoad.delivery_date : ''}`],
              ['Equipment', selectedLoad.equipment_type?.replace(/_/g,' ')],
              ['Miles', selectedLoad.estimated_miles ? selectedLoad.estimated_miles+' miles' : 'TBD'],
              ['Weight', selectedLoad.weight_lbs ? selectedLoad.weight_lbs.toLocaleString()+' lbs' : 'TBD'],
              ['Commodity', selectedLoad.commodity || 'General Freight'],
              ['Contact', selectedLoad.contact_phone || selectedLoad.contact_email || 'Via platform'],
            ].filter(([,v])=>v && v!=='undefined').map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}

            {selectedLoad.special_instructions && (
              <div style={{ marginTop: 12, padding: 16, background: 'rgba(245,158,11,0.08)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.15)' }}>
                <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Special Instructions</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{selectedLoad.special_instructions}</p>
              </div>
            )}

            <button onClick={() => claimLoad(selectedLoad)}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 20, boxShadow: '0 8px 32px rgba(45,122,95,0.4)' }}>
              🚛 Claim This Load
            </button>
          </div>
        </div>
      )}

      {/* Post Load Modal */}
      {showPost && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowPost(false)}>
          <div style={{ background: '#0d1117', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Post a Load</h2>
              <button onClick={() => setShowPost(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['company_name','Company Name *','text'],
                ['contact_phone','Contact Phone','tel'],
                ['title','Load Title *','text'],
                ['commodity','Commodity (what are you shipping?)','text'],
                ['pickup_location','Pickup Address *','text'],
                ['pickup_city','Pickup City *','text'],
                ['pickup_date','Pickup Date *','date'],
                ['delivery_location','Delivery Address *','text'],
                ['delivery_city','Delivery City *','text'],
                ['delivery_date','Delivery Date','date'],
                ['estimated_miles','Estimated Miles','number'],
                ['weight_lbs','Weight (lbs)','number'],
                ['flat_rate','Flat Rate ($)','number'],
                ['rate_per_mile','OR Rate per Mile ($)','number'],
              ].map(([key, placeholder, type]) => (
                <input key={key} type={type} placeholder={placeholder}
                  value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                  style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }} />
              ))}
              <select value={form.pickup_state} onChange={e=>setForm(f=>({...f,pickup_state:e.target.value}))}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }}>
                <option value="">Pickup State *</option>
                {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.delivery_state} onChange={e=>setForm(f=>({...f,delivery_state:e.target.value}))}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }}>
                <option value="">Delivery State *</option>
                {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.equipment_type} onChange={e=>setForm(f=>({...f,equipment_type:e.target.value}))}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }}>
                {EQUIPMENT_TYPES.map(e=><option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
              </select>
              <textarea placeholder="Special instructions (optional)" value={form.special_instructions}
                onChange={e=>setForm(f=>({...f,special_instructions:e.target.value}))} rows={3}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none', resize: 'none' }} />
              <button onClick={postLoad} disabled={posting}
                style={{ padding: 16, background: '#2D7A5F', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: posting ? 0.6 : 1 }}>
                {posting ? 'Posting...' : '📋 Post Load'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify DOT Modal */}
      {showVerify && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowVerify(false)}>
          <div style={{ background: '#0d1117', borderRadius: 24, width: '100%', maxWidth: 420, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>🔍 Verify Carrier</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>Look up any carrier's safety record via FMCSA</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input value={verifyDot} onChange={e=>setVerifyDot(e.target.value)}
                placeholder="Enter DOT number..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }} />
              <button onClick={verifyCarrier} disabled={verifying}
                style={{ padding: '12px 20px', background: '#2D7A5F', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {verifying ? '...' : 'Check'}
              </button>
            </div>
            {verifyResult && (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 16, margin: '0 0 2px' }}>{verifyResult.company_name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>DOT #{verifyResult.dot_number}</p>
                  </div>
                  <div style={{ padding: '6px 12px', borderRadius: 8, background: verifyResult.authority_status === 'active' ? 'rgba(45,122,95,0.2)' : 'rgba(239,68,68,0.2)', color: verifyResult.authority_status === 'active' ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 12 }}>
                    {verifyResult.authority_status === 'active' ? '✓ Active' : '✗ Inactive'}
                  </div>
                </div>
                {[
                  ['Safety Rating', verifyResult.safety_rating],
                  ['Insurance', verifyResult.insurance_status],
                  ['Total Trucks', verifyResult.total_trucks],
                  ['Total Drivers', verifyResult.total_drivers],
                ].map(([k,v]) => v && (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{String(v).replace(/_/g,' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
