'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[TWS Fleet Command] Unhandled error:', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#050c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 24px' }}>TWS Fleet Command encountered an unexpected error.</p>
      <button onClick={reset} style={{ padding: '12px 28px', background: '#2D7A5F', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Try Again
      </button>
    </div>
  )
}
