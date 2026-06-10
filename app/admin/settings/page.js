'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettings() {
  const router = useRouter()
  const [tab, setTab] = useState('admins')
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [admins, setAdmins] = useState([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [myRole, setMyRole] = useState('')
  const [myId, setMyId] = useState('')
  const [pinTarget, setPinTarget] = useState(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinMsg, setPinMsg] = useState(null)

  useEffect(() => {
    setMyRole(localStorage.getItem('admin_role') || '')
    setMyId(localStorage.getItem('admin_id') || '')
    loadAll()
    loadAdmins()
  }, [])

  async function loadAll() {
    const [c, l] = await Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ])
    setCustomers(Array.isArray(c) ? c : [])
    setLocations(Array.isArray(l) ? l : [])
  }

  async function loadAdmins() {
    const res = await fetch('/api/admin/auth')
    const data = await res.json()
    setAdmins(Array.isArray(data) ? data : [])
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
    if (res.ok) { setMsg(`✅ ${tab === 'customers' ? 'Customer' : 'Location'} added`); setTimeout(() => setMsg(''), 2500) }
    else { setMsg('❌ Failed to add'); setTimeout(() => setMsg(''), 2500) }
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

  async function handlePinChange() {
    if (!newPin || newPin.length < 4) { setPinMsg({ type: 'error', text: 'PIN must be at least 4 digits' }); return }
    if (newPin !== confirmPin) { setPinMsg({ type: 'error', text: 'PINs do not match' }); return }
    setPinSaving(true); setPinMsg(null)
    const res = await fetch('/api/admin/pin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_admin_id: pinTarget?.id, current_pin: currentPin, new_pin: newPin }),
    })
    const data = await res.json()
    if (res.ok) {
      setPinMsg({ type: 'success', text: `✅ PIN updated for ${pinTarget?.name}` })
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
      setTimeout(() => { setPinTarget(null); setPinMsg(null) }, 2000)
    } else {
      setPinMsg({ type: 'error', text: data.error || 'Failed' })
    }
    setPinSaving(false)
  }

  const items = tab === 'customers' ? customers : locations
  const isSuperAdmin = myRole === 'super_admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Settings</h1>
        <div className="w-12" />
      </div>

      <div className="bg-white border-b flex overflow-x-auto">
        {[['admins','🔐 Admins'],['customers','👥 Customers'],['locations','📍 Locations']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap px-3 ${
              tab === key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>{label}</button>
        ))}
      </div>

      <div className="p-4 space-y-3 pb-10">

        {/* Admins PIN Management */}
        {tab === 'admins' && (
          <>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-blue-800 text-sm font-semibold">🔐 PIN Management</p>
              <p className="text-blue-600 text-xs mt-1">
                {isSuperAdmin ? 'As super admin you can reset any PIN.' : 'You can change your own PIN only.'}
              </p>
            </div>
            {admins.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold text-sm shrink-0">{a.name[0]}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{a.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{a.role?.replace('_', ' ')}</p>
                </div>
                {(isSuperAdmin || a.id === myId) && (
                  <button onClick={() => { setPinTarget(a); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setPinMsg(null) }}
                    className="text-xs bg-[#E8F5F0] text-[#2D7A5F] font-semibold px-3 py-1.5 rounded-full">
                    Change PIN
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* Customers / Locations */}
        {(tab === 'customers' || tab === 'locations') && (
          <>
            {msg && <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</div>}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder={tab === 'customers' ? 'Add customer...' : 'Add location...'}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F]" />
              <button onClick={addItem} disabled={saving || !newName.trim()}
                className="bg-[#2D7A5F] text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-40">
                + Add
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">{tab === 'customers' ? '👥' : '📍'}</p>
                <p className="text-sm">No {tab} yet — add one above</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className={`flex-1 text-sm font-medium ${item.active ? 'text-gray-800' : 'text-gray-400'}`}>{item.name}</p>
                    <button onClick={() => toggleActive(item.id, item.active)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold ${item.active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* PIN Change Modal */}
      {pinTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setPinTarget(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Change PIN</h3>
                <p className="text-xs text-gray-400">{pinTarget.name} · {pinTarget.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setPinTarget(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            {(!isSuperAdmin || pinTarget.id === myId) && (
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Current PIN</label>
                <input type="password" inputMode="numeric" value={currentPin} onChange={e => setCurrentPin(e.target.value)}
                  placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-xl tracking-widest" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">New PIN</label>
              <input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value)}
                placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-xl tracking-widest" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Confirm PIN</label>
              <input type="password" inputMode="numeric" value={confirmPin} onChange={e => setConfirmPin(e.target.value)}
                placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-xl tracking-widest" />
            </div>
            {pinMsg && (
              <div className={`rounded-xl p-3 text-sm font-medium ${pinMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {pinMsg.text}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPinTarget(null)} className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={handlePinChange} disabled={pinSaving || !newPin}
                className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40">
                {pinSaving ? '⏳ Saving...' : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
