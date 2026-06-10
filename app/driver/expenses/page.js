'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast, { showToast } from '@/components/Toast'

const EXPENSE_TYPES = [
  { key: 'fuel', label: 'Fuel', icon: '⛽', color: 'bg-blue-50 text-blue-700' },
  { key: 'repair', label: 'Repair', icon: '🔧', color: 'bg-orange-50 text-orange-700' },
  { key: 'toll', label: 'Toll', icon: '🛣️', color: 'bg-purple-50 text-purple-700' },
  { key: 'parking', label: 'Parking', icon: '🅿️', color: 'bg-gray-50 text-gray-700' },
  { key: 'food', label: 'Food/Lodging', icon: '🍽️', color: 'bg-green-50 text-green-700' },
  { key: 'other', label: 'Other', icon: '📎', color: 'bg-pink-50 text-pink-700' },
]

export default function ExpensesPage() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'fuel', amount: '', date: new Date().toISOString().split('T')[0], description: '' })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase.from('drivers').select('*').eq('auth_id', user.id).single()
    setDriver(data)
    if (data) loadExpenses(data.id)
  }

  async function loadExpenses(id) {
    const res = await fetch(`/api/expenses?driver_id=${id}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }

  async function handleSave() {
    if (!form.amount || !driver) return
    setSaving(true)
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driver.id, truck_number: driver.truck_number, ...form }),
    })
    setForm({ type: 'fuel', amount: '', date: new Date().toISOString().split('T')[0], description: '' })
    setShowForm(false); setSaving(false)
    loadExpenses(driver.id)
    showToast('Expense logged')
  }

  const totalThisMonth = expenses
    .filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + (e.amount || 0), 0)

  const byType = EXPENSE_TYPES.map(t => ({
    ...t, total: expenses.filter(e => e.type === t.key).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(t => t.total > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Expense Tracker</h1>
        <button onClick={() => setShowForm(true)} className="text-[#2D7A5F] font-semibold text-sm">+ Add</button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-[#2D7A5F] rounded-2xl p-5 text-white">
          <p className="text-green-200 text-xs uppercase tracking-wide mb-1">This Month</p>
          <p className="text-3xl font-black">${totalThisMonth.toFixed(2)}</p>
          <p className="text-green-200 text-xs mt-1">{expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0,7))).length} expenses logged</p>
        </div>

        {byType.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-700 mb-3 text-sm">By Category</p>
            <div className="space-y-2">
              {byType.map(t => (
                <div key={t.key} className="flex items-center gap-3">
                  <span className="text-lg">{t.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{t.label}</span>
                      <span className="text-xs font-bold text-gray-800">${t.total.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2D7A5F] rounded-full" style={{ width: `${Math.min(100, (t.total / totalThisMonth) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {expenses.slice(0, 20).map(e => {
            const type = EXPENSE_TYPES.find(t => t.key === e.type) || EXPENSE_TYPES[5]
            return (
              <div key={e.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${type.color}`}>{type.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{type.label}</p>
                  <p className="text-xs text-gray-400">{e.date} {e.description ? `· ${e.description}` : ''}</p>
                </div>
                <p className="font-bold text-gray-800">${parseFloat(e.amount || 0).toFixed(2)}</p>
              </div>
            )
          })}
          {expenses.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">💸</p>
              <p className="font-medium">No expenses yet</p>
              <p className="text-sm mt-1">Tap + Add to log your first expense</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <div className="flex justify-between">
              <h3 className="font-bold text-gray-800 text-lg">Log Expense</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_TYPES.map(t => (
                <button key={t.key} onClick={() => setForm({...form, type: t.key})}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${form.type === t.key ? 'bg-[#2D7A5F] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <span className="text-xl">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">Amount ($)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase">Description (optional)</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="e.g. Loves Travel Stop - Odessa TX"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.amount}
                className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
