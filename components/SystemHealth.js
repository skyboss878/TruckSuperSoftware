'use client'
import { useState, useEffect } from 'react'

export default function SystemHealth() {
  const [health, setHealth] = useState(null)
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)

  useEffect(() => {
    check()
    const interval = setInterval(check, 5 * 60 * 1000) // every 5 min
    return () => clearInterval(interval)
  }, [])

  async function check() {
    setChecking(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data)
      setLastCheck(new Date())
    } catch { setHealth({ status: 'unreachable', checks: {}, failing: ['network'] }) }
    setChecking(false)
  }

  if (!health) return null

  const isHealthy = health.status === 'healthy'
  const failCount = health.failing?.length || 0

  return (
    <div style={{
      background: isHealthy ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
      border: `1px solid ${isHealthy ? '#86efac' : '#fca5a5'}`,
      borderRadius: '16px', padding: '14px 16px', margin: '0 0 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isHealthy ? '#16a34a' : '#dc2626', animation: 'pulse 2s infinite' }} />
          <span style={{ fontWeight: '700', fontSize: '13px', color: isHealthy ? '#166534' : '#991b1b' }}>
            {isHealthy ? 'All Systems Operational' : `${failCount} System${failCount > 1 ? 's' : ''} Degraded`}
          </span>
        </div>
        <button onClick={check} disabled={checking}
          style={{ background: 'none', border: 'none', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
          {checking ? '⏳' : '↻ Check'}
        </button>
      </div>
      {!isHealthy && health.failing?.length > 0 && (
        <p style={{ fontSize: '11px', color: '#991b1b', margin: '6px 0 0' }}>
          Failing: {health.failing.join(', ')}
        </p>
      )}
      {lastCheck && (
        <p style={{ fontSize: '10px', color: '#9ca3af', margin: '4px 0 0' }}>
          Last checked: {lastCheck.toLocaleTimeString()} · {health.response_ms}ms
        </p>
      )}
    </div>
  )
}
