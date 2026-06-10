'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettings() {
  const router = useRouter()
  const [tab, setTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [c, l] = await Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ])
    setCustomers(Array.isArray(c) ? c : [])
    setLocations(Array.isArray(l) ? l : [])
  }

  async function addItem() {
    if (!newName.trim()) return
    setSaving(true)
    const url = tab === 'customers' ? '/api/customers' : '/api/locations'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    setSaving(false)
    if (res.ok) {
      setMsg(`✅ ${tab === 'customers' ? 'Customer' : 'Location'} added`)
      setTimeout(() => setMsg(''), 2500)
    } else {
      setMsg('❌ Failed — check connection')
      setTimeout(() => setMsg(''), 2500)
    }
    loadAll()
  }

  async function toggleActive(id, active) {
    const url = tab === 'customers' ? '/api/customers' : '/api/locations'
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
    loadAll()
  }

  const items = tab === 'customers' ? customers : locations

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Settings</h1>
        <div className="w-12" />
      </div>

      <div className="bg-white border-b flex">
        {[['customers','👥 Customers'],['locations','📍 Locations']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {msg && <div className="mx-4 mt-3 px-4 py-2 rounded-xl text-sm font-semibold" style={{background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626'}}>{msg}</div>}
      <div className="p-4 space-y-3">
        {/* Add new */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={tab === 'customers' ? 'Add customer...' : 'Add location...'}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F]"
          />
          <button onClick={addItem} disabled={saving || !newName.trim()}
            className="bg-[#2D7A5F] text-white px-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-40">
            Add
          </button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">{tab === 'customers' ? '👥' : '📍'}</p>
            <p>No {tab} yet</p>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
            <p className={`font-medium ${item.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
              {item.name}
            </p>
            <button onClick={() => toggleActive(item.id, item.active)}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {item.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
