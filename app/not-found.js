'use client'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#050c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚛</div>
      <p style={{ color: '#2D7A5F', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>404 — Lost on the road</p>
      <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-1px' }}>Page not found</h1>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '0 0 32px' }}>This route doesn't exist in TruckSuperSoftware.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => router.push('/driver')} style={{ padding: '12px 24px', background: '#2D7A5F', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          🚛 Driver Portal
        </button>
        <button onClick={() => router.push('/login')} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Sign In
        </button>
      </div>
    </div>
  )
}
