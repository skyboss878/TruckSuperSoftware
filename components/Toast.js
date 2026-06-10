'use client'
import { useState, useEffect } from 'react'

let toastFn = null
export function showToast(msg, type = 'success') {
  if (toastFn) toastFn({ msg, type, id: Date.now() })
}

export default function Toast() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    toastFn = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000)
    }
    return () => { toastFn = null }
  }, [])

  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px', maxWidth: '320px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 16px', borderRadius: '14px', fontWeight: '600', fontSize: '14px',
          background: t.type === 'error' ? '#fef2f2' : t.type === 'warning' ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fecaca' : t.type === 'warning' ? '#fde68a' : '#bbf7d0'}`,
          color: t.type === 'error' ? '#dc2626' : t.type === 'warning' ? '#d97706' : '#16a34a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideDown .3s ease',
        }}>
          <span>{t.type === 'error' ? '⚠️' : t.type === 'warning' ? '⚡' : '✅'}</span>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
