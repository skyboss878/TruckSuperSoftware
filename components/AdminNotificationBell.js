'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNotificationBell() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    loadAlerts()
    const ch = supabase.channel('admin-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, loadAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_trip_inspections' }, loadAlerts)
      .subscribe()
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => { supabase.removeChannel(ch); document.removeEventListener('mousedown', close) }
  }, [])

  async function loadAlerts() {
    try {
      const [msgs, tickets, maint, pretrip] = await Promise.all([
        fetch('/api/messages').then(r => r.json()),
        fetch('/api/tickets?status=submitted').then(r => r.json()),
        fetch('/api/maintenance?status=open').then(r => r.json()),
        fetch('/api/pre-trip?admin=true').then(r => r.json()),
      ])
      const unread = Array.isArray(msgs) ? msgs.filter(m => !m.is_read && m.sender_role === 'driver').length : 0
      const pending = Array.isArray(tickets) ? tickets.length : 0
      const openM = Array.isArray(maint) ? maint.length : 0
      const defects = Array.isArray(pretrip?.drivers) ? pretrip.drivers.filter(d => d.inspection?.defects_found).length : 0
      const total = unread + pending + openM + defects
      setCount(total)
      setAlerts([
        unread   > 0 && { icon: '💬', text: `${unread} unread driver message${unread>1?'s':''}`,     tab: 'messages',     color: 'bg-blue-50 text-blue-700' },
        pending  > 0 && { icon: '🎫', text: `${pending} ticket${pending>1?'s':''} need approval`,   tab: 'tickets',      color: 'bg-yellow-50 text-yellow-700' },
        openM    > 0 && { icon: '🔧', text: `${openM} maintenance issue${openM>1?'s':''} open`,     tab: 'maintenance',  color: 'bg-orange-50 text-orange-700' },
        defects  > 0 && { icon: '⚠️', text: `${defects} pre-trip defect${defects>1?'s':''} flagged`, tab: 'pretrip',     color: 'bg-red-50 text-red-700' },
      ].filter(Boolean))
    } catch(e) {}
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '4px 8px' }}>
        <span style={{ fontSize: '22px' }}>🔔</span>
        {count > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #2D7A5F' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'white', borderRadius: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', border: '1px solid #f0f0f0', minWidth: '280px', zIndex: 999, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#111' }}>Notifications</span>
            {count > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>{count} new</span>}
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
              <p style={{ fontSize: '13px', margin: 0 }}>All clear — nothing needs attention</p>
            </div>
          ) : (
            alerts.map((a, i) => (
              <button key={i} onClick={() => { router.push('/admin'); setOpen(false) }}
                style={{ width: '100%', padding: '12px 16px', borderBottom: '1px solid #fafafa', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '18px' }}>{a.icon}</span>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{a.text}</span>
                <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '12px' }}>→</span>
              </button>
            ))
          )}
          <div style={{ padding: '10px 16px', background: '#fafafa', textAlign: 'center' }}>
            <button onClick={() => { router.push('/admin/audit'); setOpen(false) }} style={{ background: 'none', border: 'none', color: '#2D7A5F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              View audit log →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
