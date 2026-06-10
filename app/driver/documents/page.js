'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast, { showToast } from '@/components/Toast'

const DOC_TYPES = [
  { key: 'cdl', label: "CDL License", icon: "🪪" },
  { key: 'medical', label: "Medical Certificate", icon: "🏥" },
  { key: 'insurance', label: "Insurance Card", icon: "🛡️" },
  { key: 'registration', label: "Vehicle Registration", icon: "📋" },
  { key: 'hazmat', label: "Hazmat Cert", icon: "☢️" },
  { key: 'other', label: "Other Document", icon: "📄" },
]

export default function DocumentVault() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [docs, setDocs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ doc_type: 'cdl', expiry_date: '', notes: '' })
  const [file, setFile] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase.from('drivers').select('*').eq('auth_id', user.id).single()
    setDriver(data)
    if (data) loadDocs(data.id)
  }

  async function loadDocs(id) {
    const res = await fetch(`/api/documents?driver_id=${id}`)
    const data = await res.json()
    setDocs(Array.isArray(data) ? data : [])
  }

  async function handleSave() {
    if (!driver || !form.doc_type) return
    setSaving(true)
    let file_url = null, file_name = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `documents/${driver.id}/${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('driver-docs').upload(path, file)
      if (up) {
        const { data: url } = supabase.storage.from('driver-docs').getPublicUrl(path)
        file_url = url.publicUrl
        file_name = file.name
      }
    }
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driver.id, ...form, file_url, file_name }),
    })
    setForm({ doc_type: 'cdl', expiry_date: '', notes: '' })
    setFile(null); setShowForm(false); setSaving(false)
    loadDocs(driver.id)
    showToast('Document saved')
  }

  async function handleDelete(id) {
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
    loadDocs(driver.id)
  }

  function daysUntilExpiry(date) {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / 86400000)
  }

  const expiringSoon = docs.filter(d => { const days = daysUntilExpiry(d.expiry_date); return days !== null && days <= 30 && days >= 0 })
  const expired = docs.filter(d => { const days = daysUntilExpiry(d.expiry_date); return days !== null && days < 0 })

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Document Vault</h1>
        <button onClick={() => setShowForm(true)} className="text-[#2D7A5F] font-semibold text-sm">+ Add</button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {expired.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-bold text-red-700 text-sm">🚨 {expired.length} Expired Document{expired.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-500 mt-1">{expired.map(d => DOC_TYPES.find(t => t.key === d.doc_type)?.label || d.doc_type).join(', ')}</p>
          </div>
        )}
        {expiringSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-bold text-amber-700 text-sm">⚠️ Expiring Soon</p>
            <p className="text-xs text-amber-600 mt-1">{expiringSoon.map(d => `${DOC_TYPES.find(t => t.key === d.doc_type)?.label}: ${daysUntilExpiry(d.expiry_date)} days`).join(' · ')}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {DOC_TYPES.map(type => {
            const doc = docs.find(d => d.doc_type === type.key)
            const days = doc ? daysUntilExpiry(doc.expiry_date) : null
            const status = !doc ? 'missing' : days === null ? 'valid' : days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'valid'
            return (
              <div key={type.key} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                status === 'expired' ? 'border-red-200' : status === 'expiring' ? 'border-amber-200' : status === 'missing' ? 'border-gray-100' : 'border-green-100'
              }`}>
                <div className="text-2xl mb-2">{type.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{type.label}</p>
                {doc ? (
                  <>
                    <p className={`text-xs mt-1 font-medium ${status === 'expired' ? 'text-red-500' : status === 'expiring' ? 'text-amber-500' : 'text-green-600'}`}>
                      {status === 'expired' ? '⛔ Expired' : status === 'expiring' ? `⚠️ ${days}d left` : '✅ Valid'}
                    </p>
                    {doc.expiry_date && <p className="text-xs text-gray-400">Exp: {new Date(doc.expiry_date).toLocaleDateString()}</p>}
                    {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#2D7A5F] font-semibold">View →</a>}
                  </>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Not uploaded</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Add Document</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Document Type</label>
              <select value={form.doc_type} onChange={e => setForm({...form, doc_type: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]">
                {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Upload File (optional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
