'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ManageLists() {
  const router = useRouter()
  const [tab, setTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data?.session?.access_token)
    })
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [cRes, lRes] = await Promise.all([fetch('/api/customers'), fetch('/api/locations')])
      const [c, l] = await Promise.all([cRes.json(), lRes.json()])
      setCustomers(Array.isArray(c) ? c : [])
      setLocations(Array.isArray(l) ? l : [])
    } catch { setError('Failed to load data') }
  }

  async function addItem() {
    if (!newName.trim() || !token) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to add') }
      else { setNewName(''); loadAll() }
    } catch { setError('Network error') }
    setSaving(false)
  }

  async function toggleActive(item) {
    if (!token) return
    if (tab === 'customers') setCustomers(prev => prev.map(c => c.id === item.id ? { ...c, active: !c.active } : c))
    else setLocations(prev => prev.map(l => l.id === item.id ? { ...l, active: !l.active } : l))
    try {
      await fetch(`/api/${tab}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      })
    } catch { loadAll() }
  }

  const allItems = tab === 'customers' ? customers : locations
  const items = showInactive ? allItems : allItems.filter(i => i.active)
  const activeCount = allItems.filter(i => i.active).length
  const inactiveCount = allItems.filter(i => !i.active).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Manage Lists</h1>
        <button onClick={() => setShowInactive(!showInactive)} className="text-xs text-gray-400 font-medium">
          {showInactive ? 'Hide inactive' : 'Show all'}
        </button>
      </div>

      <div className="bg-white border-b flex">
        {[
          { key: 'customers', label: '👥 Customers', count: customers.filter(c => c.active).length },
          { key: 'locations', label: '📍 Locations', count: locations.filter(l => l.active).length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 ${tab === t.key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'}`}>
            {t.label} <span className="text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 pb-10">
        {error && <div className="bg-red-50 rounded-xl p-3"><p className="text-red-600 text-sm">{error}</p></div>}

        <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={`Add new ${tab === 'customers' ? 'customer' : 'location'}...`}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#2D7A5F] text-sm" />
          <button onClick={addItem} disabled={saving || !newName.trim()}
            className="bg-[#2D7A5F] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-40">
            {saving ? '...' : '+ Add'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#2D7A5F]">{activeCount}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
            <p className="text-xs text-gray-400">Inactive</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">{tab === 'customers' ? '👥' : '📍'}</p>
              <p>No {tab} yet — add one above</p>
            </div>
          )}
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-3 p-4 ${!item.active ? 'opacity-50' : ''}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <p className="flex-1 text-gray-800 font-medium">{item.name}</p>
              <button onClick={() => toggleActive(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${item.active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                {item.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
