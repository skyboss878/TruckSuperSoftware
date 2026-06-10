'use client'
import { useState, useEffect } from 'react'

export default function DriverStatsCard({ driver }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (driver?.id) loadStats()
  }, [driver?.id])

  async function loadStats() {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const [scoreRes, ticketsRes] = await Promise.all([
        fetch(`/api/scorecard?driver_id=${driver.id}&days=30`).then(r => r.json()),
        fetch(`/api/tickets?driver_id=${driver.id}`).then(r => r.json()),
      ])
      const score = Array.isArray(scoreRes) && scoreRes[0] ? scoreRes[0] : null
      const tickets = Array.isArray(ticketsRes) ? ticketsRes : []
      const weekTickets = tickets.filter(t => t.date >= since)
      const approved = weekTickets.filter(t => t.status === 'approved').length
      setStats({
        grade: score?.safety?.grade || '—',
        score: score?.safety?.score || 0,
        miles: score?.miles?.total || 0,
        weekTickets: weekTickets.length,
        weekApproved: approved,
        stateBreakdown: score?.miles ? [] : [],
      })
    } catch(e) {}
  }

  if (!stats) return null

  const gradeColors = { A:'#16a34a', B:'#2563eb', C:'#d97706', D:'#ea580c', F:'#dc2626' }
  const color = gradeColors[stats.grade] || '#6b7280'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a3a2a, #0d2419)',
      borderRadius: '20px', padding: '16px', margin: '0 0 16px',
      border: '1px solid rgba(45,122,95,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 2px' }}>Your Performance</p>
          <p style={{ color: 'white', fontWeight: '800', fontSize: '15px', margin: 0 }}>{driver.name}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${color}60` }}>
            <span style={{ color: 'white', fontSize: '26px', fontWeight: '900' }}>{stats.grade}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', margin: '4px 0 0', textAlign: 'center' }}>Safety</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Score', value: stats.score, icon: '⭐' },
          { label: 'Miles', value: stats.miles.toLocaleString(), icon: '🛣️' },
          { label: 'Loads/Wk', value: stats.weekTickets, icon: '🎫' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginTop: '3px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
