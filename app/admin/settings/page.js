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
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [me, setMe] = useState(null)
  const [dispatchPhone, setDispatchPhone] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [pinTarget, setPinTarget] = useState(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinMsg, setPinMsg] = useState(null)
  const [showNewAdmin, setShowNewAdmin] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPin, setNewAdminPin] = useState('')
  const [newAdminSaving, setNewAdminSaving] = useState(false)
  const [newAdminMsg, setNewAdminMsg] = useState(null)

  useEffect(() => {
    loadMe()
    loadAll()
    loadAdmins()
    loadPhone()
  }, [])

  async function loadPhone() {
    try {
      const res = await fetch('/api/settings')
      const d = await res.json()
      if (d?.dispatch_phone) setDispatchPhone(d.dispatch_phone)
    } catch {}
  }

  async function savePhone() {
    setPhoneSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispatch_phone: dispatchPhone }),
    })
    setPhoneSaving(false)
    setMsg('✅ Phone number saved')
    setTimeout(() => setMsg(''), 2500)
  }

  async function loadMe() {
    try {
      const res = await fetch('/api/admin/me')
      if (res.ok) setMe(await res.json())
    } catch {}
  }

  async function loadAll() {
    try {
      const [c, l] = await Promise.all([
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/locations').then(r => r.json()),
      ])
      setCustomers(Array.isArray(c) ? c : [])
      setLocations(Array.isArray(l) ? l : [])
    } catch { setMsg('❌ Failed to load data') }
  }

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin/auth')
      const data = await res.json()
      setAdmins(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function addItem() {
    if (!newName.trim()) return
    setSaving(true)
    const url = tab === 'customers' ? '/api/customers' : '/api/locations'
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      setNewName('')
      if (res.ok) { setMsg(`✅ ${tab === 'customers' ? 'Customer' : 'Location'} added`); setTimeout(() => setMsg(''), 2500) }
      else { setMsg('❌ Failed to add'); setTimeout(() => setMsg(''), 2500) }
      loadAll()
    } catch { setMsg('❌ Connection error') }
    setSaving(false)
  }

  async function doToggle(id, active) {
    const url = tab === 'customers' ? '/api/customers' : '/api/locations'
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
    setConfirmDeactivate(null)
    loadAll()
  }

  async function handlePinChange() {
    if (!/^\d{4,8}$/.test(newPin)) { setPinMsg({ type: 'error', text: 'PIN must be 4–8 digits only' }); return }
    if (newPin !== confirmPin) { setPinMsg({ type: 'error', text: 'PINs do not match' }); return }
    setPinSaving(true); setPinMsg(null)
    try {
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
    } catch { setPinMsg({ type: 'error', text: 'Connection error' }) }
    setPinSaving(false)
  }

  async function createAdmin() {
    if (!newAdminName.trim() || !newAdminPin.trim()) {
      setNewAdminMsg({ type: 'error', text: 'Name and PIN are required' })
      return
    }
    if (newAdminPin.length < 4) {
      setNewAdminMsg({ type: 'error', text: 'PIN must be at least 4 digits' })
      return
    }
    setNewAdminSaving(true)
    setNewAdminMsg(null)
    try {
      const res = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAdminName.trim(), pin: newAdminPin, role: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setNewAdminMsg({ type: 'success', text: `✅ ${newAdminName} added as Dispatcher` })
      setNewAdminName('')
      setNewAdminPin('')
      setShowNewAdmin(false)
      loadAdmins()
    } catch (e) {
      setNewAdminMsg({ type: 'error', text: e.message })
    } finally {
      setNewAdminSaving(false)
    }
  }

  async function deleteAdmin(id, name) {
    if (!confirm(`Remove ${name} from TruckSuperSoftware?`)) return
    const res = await fetch(`/api/admin/manage?id=${id}`, { method: 'DELETE' })
    if (res.ok) loadAdmins()
  }

  // Server-side role — NOT localStorage
  const isSuperAdmin = me?.role === 'super_admin'

  const allItems = tab === 'customers' ? customers : locations
  const items = search
    ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems

  const roleColors = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    dispatcher: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Settings</h1>
        {me && <span className="text-xs text-gray-400">{me.name}</span>}
      </div>

      <div className="bg-white border-b flex overflow-x-auto">
        {[['admins','🔐 Admins'],['customers','👥 Customers'],['locations','📍 Locations'],['system','⚡ System']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setSearch('') }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap px-3 ${
              tab === key ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>{label}</button>
        ))}
      </div>

      <div className="p-4 space-y-3 pb-10">

        {/* ── ADMINS ── */}
        {tab === 'admins' && (
          <>
            <div className={`rounded-2xl p-4 border ${isSuperAdmin ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-sm font-semibold ${isSuperAdmin ? 'text-purple-800' : 'text-blue-800'}`}>
                {isSuperAdmin ? '👑 Super Admin — Reset any PIN' : '🔐 Admin — Change your own PIN only'}
              </p>
              {me && <p className="text-xs text-gray-500 mt-1">Logged in as {me.name}</p>}
            </div>

            {admins.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {a.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{a.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[a.role] || 'bg-gray-100 text-gray-600'}`}>
                    {a.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(isSuperAdmin || a.id === me?.id) && (
                    <button onClick={() => { setPinTarget(a); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setPinMsg(null) }}
                      className="text-xs bg-[#E8F5F0] text-[#2D7A5F] font-semibold px-3 py-1.5 rounded-full">
                      Change PIN
                    </button>
                  )}
                  {isSuperAdmin && a.role !== 'super_admin' && (
                    <button onClick={() => deleteAdmin(a.id, a.name)}
                      className="text-xs bg-red-50 text-red-500 font-semibold px-3 py-1.5 rounded-full">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Dispatcher — super admin only */}
            {isSuperAdmin && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                {!showNewAdmin ? (
                  <button onClick={() => setShowNewAdmin(true)}
                    className="w-full py-3 border-2 border-dashed border-[#2D7A5F] text-[#2D7A5F] rounded-xl font-semibold text-sm">
                    + Add Dispatcher
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="font-bold text-gray-800 text-sm">New Dispatcher</p>
                    {newAdminMsg && (
                      <p className={`text-xs font-semibold ${newAdminMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {newAdminMsg.text}
                      </p>
                    )}
                    <input value={newAdminName} onChange={e => setNewAdminName(e.target.value)}
                      placeholder="Full name..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F]" />
                    <input value={newAdminPin} onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="PIN (4+ digits)..."
                      type="password" inputMode="numeric" maxLength={8}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F]" />
                    <div className="flex gap-2">
                      <button onClick={createAdmin} disabled={newAdminSaving}
                        className="flex-1 bg-[#2D7A5F] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40">
                        {newAdminSaving ? 'Adding...' : 'Add Dispatcher'}
                      </button>
                      <button onClick={() => { setShowNewAdmin(false); setNewAdminMsg(null) }}
                        className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CUSTOMERS / LOCATIONS ── */}
        {(tab === 'customers' || tab === 'locations') && (
          <>
            {msg && (
              <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {msg}
              </div>
            )}

            {/* Add new */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder={tab === 'customers' ? 'New customer name...' : 'New location name...'}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D7A5F]" />
              <button onClick={addItem} disabled={saving || !newName.trim()}
                className="bg-[#2D7A5F] text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-40">
                + Add
              </button>
            </div>

            {/* Search */}
            {allItems.length > 5 && (
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-9 text-sm outline-none focus:border-[#2D7A5F] bg-white" />
                <span className="absolute left-3 top-3.5 text-gray-400 text-sm">🔍</span>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="font-bold text-[#2D7A5F]">{allItems.filter(i => i.active).length}</p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="font-bold text-gray-400">{allItems.filter(i => !i.active).length}</p>
                <p className="text-xs text-gray-400">Inactive</p>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="font-bold text-gray-800">{allItems.length}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">{tab === 'customers' ? '👥' : '📍'}</p>
                <p className="text-sm">{search ? `No results for "${search}"` : `No ${tab} yet — add one above`}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className={`flex-1 text-sm font-medium ${item.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {item.name}
                    </p>
                    <button
                      onClick={() => item.active ? setConfirmDeactivate(item) : doToggle(item.id, item.active)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 ${
                        item.active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                      }`}>
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── SYSTEM TAB ── */}
      {tab === 'system' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-1">📞 Dispatch Phone</p>
            <p className="text-xs text-gray-400 mb-3">Drivers see a floating call button on their app</p>
            <input value={dispatchPhone} onChange={e => setDispatchPhone(e.target.value)}
              placeholder="+1 (555) 000-0000" type="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#2D7A5F] text-sm mb-3" />
            <button onClick={savePhone} disabled={phoneSaving}
              className="w-full py-3 bg-[#2D7A5F] text-white rounded-xl font-semibold text-sm disabled:opacity-40">
              {phoneSaving ? 'Saving...' : 'Save Phone Number'}
            </button>
          </div>
        </div>
      )}

      {/* ── DEACTIVATE CONFIRM ── */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" onClick={() => setConfirmDeactivate(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-2xl mb-3 text-center">⚠️</p>
            <h3 className="font-bold text-gray-800 text-center text-lg mb-2">Deactivate?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{confirmDeactivate.name}</strong> will no longer appear in dropdowns for new tickets.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmDeactivate(null)} className="py-3 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={() => doToggle(confirmDeactivate.id, confirmDeactivate.active)}
                className="py-3 bg-red-500 text-white rounded-2xl font-semibold">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PIN MODAL ── */}
      {pinTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setPinTarget(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Change PIN</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{pinTarget.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[pinTarget.role] || 'bg-gray-100'}`}>
                    {pinTarget.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button onClick={() => setPinTarget(null)} className="text-gray-400 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>

            {(!isSuperAdmin || pinTarget.id === me?.id) && (
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Current PIN</label>
                <input type="password" inputMode="numeric" value={currentPin} onChange={e => setCurrentPin(e.target.value)}
                  placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-2xl tracking-widest text-center" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">New PIN (4–8 digits)</label>
              <input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-2xl tracking-widest text-center" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Confirm PIN</label>
              <input type="password" inputMode="numeric" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-2xl tracking-widest text-center" />
            </div>

            {/* PIN strength indicator */}
            {newPin.length > 0 && (
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i < newPin.length ? (newPin.length >= 6 ? 'bg-green-500' : newPin.length >= 4 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-gray-100'}`} />
                ))}
              </div>
            )}

            {pinMsg && (
              <div className={`rounded-xl p-3 text-sm font-medium ${pinMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {pinMsg.text}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPinTarget(null)} className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={handlePinChange} disabled={pinSaving || newPin.length < 4}
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
