'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast, { showToast } from '@/components/Toast'

const SCAN_TYPES = [
  { key: 'fuel_receipt', label: 'Fuel Receipt', icon: '⛽', color: '#2D7A5F' },
  { key: 'bol', label: 'Bill of Lading', icon: '📋', color: '#3B82F6' },
  { key: 'scale_ticket', label: 'Scale Ticket', icon: '⚖️', color: '#F59E0B' },
  { key: 'invoice', label: 'Invoice', icon: '🧾', color: '#8B5CF6' },
]

export default function DocumentScanner() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])
  const fileRef = useRef(null)
  const pendingType = useRef(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase.from('drivers').select('*').eq('auth_id', user.id).single()
    setDriver(data)
    loadRecent(data.id)
  }

  async function loadRecent(driver_id) {
    const res = await fetch(`/api/document-scan?driver_id=${driver_id}`)
    const data = await res.json()
    setRecent((data || []).slice(0, 5))
  }

  function startScan(type) {
    pendingType.current = type
    fileRef.current?.click()
  }

  async function handleFile(file) {
    if (!file || !driver) return
    setScanning(true)
    setResult(null)
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/document-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, media_type: file.type || 'image/jpeg', driver_id: driver.id }),
      })

      const data = await response.json()

      if (data.duplicate) {
        showToast('This document was already scanned')
        setScanning(false)
        return
      }

      if (data.error) {
        showToast('Scan failed: ' + data.error)
        setScanning(false)
        return
      }

      setResult(data)
      loadRecent(driver.id)
      if (data.auto_created) {
        showToast(`✅ Saved to ${data.auto_created.table}`)
      } else {
        showToast('Scanned — review details below')
      }
    } catch (err) {
      showToast('Scan error: ' + err.message)
    } finally {
      setScanning(false)
    }
  }

  const docMeta = (type) => SCAN_TYPES.find(t => t.key === type) || { icon: '📄', label: 'Document', color: '#6B7280' }

  function confLabel(c) {
    if (c === 'high') return { text: 'High', color: '#22c55e' }
    if (c === 'medium') return { text: 'Medium', color: '#f59e0b' }
    return { text: 'Low — verify', color: '#ef4444' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '40px' }}>
      <Toast />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />

      <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #0d2419)', padding: '20px', color: 'white' }}>
        <button onClick={() => router.push('/driver')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '8px', cursor: 'pointer' }}>← Back</button>
        <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>📷 Document Scanner</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>AI-powered OCR — snap a photo and we'll do the rest</p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Scan buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {SCAN_TYPES.map(t => (
            <button key={t.key} onClick={() => startScan(t.key)} disabled={scanning}
              style={{
                background: 'white', border: `2px solid ${t.color}22`, borderRadius: '16px',
                padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                cursor: 'pointer', opacity: scanning ? 0.5 : 1,
              }}>
              <span style={{ fontSize: '32px' }}>{t.icon}</span>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#1f2937' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {scanning && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '16px', border: '2px solid #2D7A5F22' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
            <p style={{ fontWeight: '700', color: '#1f2937', margin: '0 0 4px' }}>Analyzing document...</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>This takes a few seconds</p>
          </div>
        )}

        {/* Scan result */}
        {result && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '2px solid #2D7A5F' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{docMeta(result.doc_type).icon}</span>
              <div>
                <p style={{ fontWeight: '800', margin: 0, color: '#1f2937' }}>{docMeta(result.doc_type).label}</p>
                {result.confidence?.overall && (
                  <p style={{ fontSize: '11px', margin: 0, color: confLabel(result.confidence.overall).color, fontWeight: '600' }}>
                    Overall confidence: {confLabel(result.confidence.overall).text}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              {Object.entries(result.extracted || {}).map(([key, val]) => {
                const conf = result.confidence?.[key]
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: '700', color: val === null ? '#9ca3af' : '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {val !== null && val !== '' ? String(val) : 'not found'}
                      {conf && conf !== 'high' && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', background: confLabel(conf).color + '22', color: confLabel(conf).color }}>
                          {confLabel(conf).text}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            {result.auto_created ? (
              <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center', color: '#16a34a', fontWeight: '700', fontSize: '13px' }}>
                ✅ Automatically saved to {result.auto_created.table.replace('_', ' ')}
              </div>
            ) : (
              <div style={{ marginTop: '12px', padding: '10px', background: '#fef3c7', borderRadius: '10px', textAlign: 'center', color: '#92400e', fontWeight: '700', fontSize: '13px' }}>
                📋 Saved for review — no auto-entry for this document type
              </div>
            )}

            {result.image_url && (
              <img src={result.image_url} alt="Scanned document" style={{ width: '100%', borderRadius: '10px', marginTop: '12px' }} />
            )}

            <button onClick={() => setResult(null)} style={{ width: '100%', marginTop: '12px', padding: '12px', background: '#2D7A5F', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
              Scan Another
            </button>
          </div>
        )}

        {/* Recent scans */}
        {recent.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>Recent Scans</h3>
            {recent.map(r => (
              <div key={r.id} style={{ background: 'white', borderRadius: '12px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '20px' }}>{docMeta(r.doc_type).icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700', fontSize: '13px', margin: 0, color: '#1f2937' }}>{docMeta(r.doc_type).label}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: r.status === 'confirmed' ? '#dcfce7' : '#fef3c7', color: r.status === 'confirmed' ? '#16a34a' : '#92400e', fontWeight: '700' }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
