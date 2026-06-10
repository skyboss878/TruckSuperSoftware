'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = ['fuel','repair','toll','parking','food','other']
const ICONS = { fuel:'⛽', repair:'🔧', toll:'🛣️', parking:'🅿️', food:'🍽️', other:'📎' }

export default function ExpenseReport() {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => { loadExpenses() }, [days])

  async function loadExpenses() {
    setLoading(true)
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const res = await fetch('/api/expenses')
    const data = await res.json()
    const filtered = Array.isArray(data) ? data.filter(e => e.date >= since) : []
    setExpenses(filtered)
    setLoading(false)
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const byDriver = {}
  expenses.forEach(e => {
    const name = e.drivers?.name || 'Unknown'
    if (!byDriver[name]) byDriver[name] = 0
    byDriver[name] += e.amount || 0
  })
  const byType = TYPES.map(t => ({ type: t, total: expenses.filter(e => e.type === t).reduce((s, e) => s + (e.amount || 0), 0) })).filter(t => t.total > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Expense Report</h1>
      </div>
      <div className="p-4 space-y-4 pb-10">
        <div className="flex gap-2">
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${days===d?'bg-[#2D7A5F] text-white':'bg-white text-gray-500'}`}>
              {d === 7 ? '7 Days' : d === 30 ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <div className="bg-[#2D7A5F] rounded-2xl p-5 text-white text-center">
          <p className="text-green-200 text-xs uppercase tracking-wide mb-1">Total Fleet Expenses</p>
          <p className="text-4xl font-black">${total.toFixed(2)}</p>
          <p className="text-green-200 text-xs mt-1">{expenses.length} expenses · {Object.keys(byDriver).length} drivers</p>
        </div>
        {byType.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-700 mb-3">By Category</p>
            {byType.map(t => (
              <div key={t.type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{ICONS[t.type]}</span>
                  <span className="text-sm font-medium text-gray-700 capitalize">{t.type}</span>
                </div>
                <span className="font-bold text-gray-800">${t.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        {Object.keys(byDriver).length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-700 mb-3">By Driver</p>
            {Object.entries(byDriver).sort((a,b) => b[1]-a[1]).map(([name, amt]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                <span className="font-bold text-gray-800">${amt.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
