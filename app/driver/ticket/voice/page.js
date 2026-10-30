'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { qdb } from '@/lib/ticket-queue'

const LABELS = {
  customer_name: 'Customer', location_delivered: 'Delivered to', po_number: 'PO #',
  afe_number: 'AFE #', sand_type: 'Product', quantity: 'Quantity', unit: 'Unit', bol_signed_by: 'Signed by',
}

export default function VoiceTicket() {
  const [rec, setRec] = useState(false)
  const [items, setItems] = useState([])
  const [online, setOnline] = useState(true)
  const mr = useRef(null)
  const chunks = useRef([])
  const syncing = useRef(false)

  const load = useCallback(async () => {
    setItems(await qdb.notes.orderBy('ts').reverse().limit(20).toArray())
  }, [])

  const sync = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return
    syncing.current = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const queued = await qdb.notes.where('status').equals('queued').toArray()
      for (const n of queued) {
        const fd = new FormData()
        fd.append('audio', n.audio)
        fd.append('meta', JSON.stringify({ client_id: n.id, ts: n.ts, date: n.date, lat: n.lat, lng: n.lng }))
        try {
          const res = await fetch('/api/tickets/voice', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + session.access_token },
            body: fd,
          })
          if (res.status === 401) break
          if (res.ok) {
            const j = await res.json()
            await qdb.notes.update(n.id, { status: 'synced', ticketId: j.id, missing: j.missing || [], ticket: j.ticket || null })
          }
        } catch { break }
      }
    } finally {
      syncing.current = false
      load()
    }
  }, [load])

  useEffect(() => {
    load(); sync()
    navigator.storage?.persist?.()
    setOnline(navigator.onLine)
    const on = () => { setOnline(true); sync() }
    const off = () => setOnline(false)
    const vis = () => { if (document.visibilityState === 'visible') sync() }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    document.addEventListener('visibilitychange', vis)
    const t = setInterval(sync, 30000)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      document.removeEventListener('visibilitychange', vis)
      clearInterval(t)
    }
  }, [load, sync])

  async function toggle() {
    if (rec) { mr.current?.stop(); return }
    let stream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { alert('Microphone permission is needed to record.'); return }
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const m = new MediaRecorder(stream, { mimeType: mime })
    chunks.current = []
    m.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
    m.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const audio = new Blob(chunks.current, { type: mime })
      const pos = await new Promise(res =>
        navigator.geolocation.getCurrentPosition(res, () => res(null), { timeout: 4000 }))
      await qdb.notes.add({
        id: crypto.randomUUID(), status: 'queued', audio, mime, ts: Date.now(),
        date: new Date().toLocaleDateString('en-CA'),
        lat: pos?.coords.latitude ?? null, lng: pos?.coords.longitude ?? null,
      })
      setRec(false); await load(); sync()
    }
    m.start(); mr.current = m; setRec(true)
  }

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h1 className="text-xl font-bold mb-1">Voice Ticket</h1>
      <p className="text-sm mb-4">{online ? 'Online' : 'Offline: recordings save on this phone and send when you have signal'}</p>
      <button onClick={toggle}
        className={'w-44 h-44 rounded-full text-white text-2xl font-bold ' + (rec ? 'bg-red-600' : 'bg-green-600')}>
        {rec ? 'STOP' : 'RECORD'}
      </button>
      <p className="text-xs text-gray-500 mt-3">Say: customer, delivered to, PO, AFE, product, quantity, who signed.</p>
      <div className="mt-6 space-y-3 text-left">
        {items.map(n => (
          <div key={n.id} className="border rounded p-3">
            <div className="flex justify-between text-sm">
              <span>{new Date(n.ts).toLocaleTimeString()}</span>
              <span className={n.status === 'synced' ? 'text-blue-700' : 'text-yellow-700'}>
                {n.status === 'synced' ? 'Sent' : 'Waiting for signal'}
              </span>
            </div>
            {n.status === 'synced' && n.ticket && (
              <div className="text-sm mt-2">
                <div>{n.ticket.customer_name || 'No customer'} · {n.ticket.quantity ?? '?'} {n.ticket.unit || ''} {n.ticket.sand_type || ''}</div>
                {n.missing?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.missing.map(k => (
                      <span key={k} className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Missing: {LABELS[k] || k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
