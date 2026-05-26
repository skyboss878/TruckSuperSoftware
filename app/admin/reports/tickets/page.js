'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TicketsReport() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    driver_id: '', start_date: '', end_date: '',
    customer: '', status: '', location: '',
  })

  useEffect(() => { loadDrivers() }, [])

  async function loadDrivers() {
    const { data } = await supabase.from('drivers').select('*').order('name')
    setDrivers(data || [])
  }

  function set(field, value) {
    setFilters(f => ({ ...f, [field]: value }))
  }

  async function runReport() {
    setLoading(true)
    let query = supabase.from('tickets').select('*, drivers(name)').order('date', { ascending: false })
    if (filters.driver_id) query = query.eq('driver_id', filters.driver_id)
    if (filters.start_date) query = query.gte('date', filters.start_date)
    if (filters.end_date) query = query.lte('date', filters.end_date)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.customer) query = query.ilike('customer_name', `%${filters.customer}%`)
    if (filters.location) query = query.ilike('location_loaded', `%${filters.location}%`)
    const { data } = await query
    setTickets(data || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Driver', 'Customer', 'Load ID', 'BOL', 'Location', 'Truck', 'Trailer', 'PO#', 'Sand Type', 'Boxes', 'Total Weight (ton)', 'Status'],
      ...tickets.map(t => [
        t.date,
        t.drivers?.name,
        t.customer_name,
        t.load_id,
        t.bol_number,
        t.location_loaded,
        t.truck_number,
        t.trailer_number,
        t.po_number,
        t.sand_type,
        t.boxes?.length || 0,
        t.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0) || 0,
        t.status,
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets_report_${filters.start_date || 'all'}_${filters.end_date || 'all'}.csv`
    a.click()
  }

  const totalWeight = tickets.reduce((s, t) =>
    s + (t.boxes?.reduce((bs, b) => bs + (parseFloat(b.weight) || 0), 0) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Ticket Report</h1>
        {tickets.length > 0 && (
          <button onClick={exportCSV} className="text-[#2D7A5F] font-medium text-sm">CSV</button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700">Filters</h2>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Driver</label>
            <select value={filters.driver_id} onChange={e => set('driver_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
              <option value="">All drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Start Date</label>
              <input type="date" value={filters.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">End Date</label>
              <input type="date" value={filters.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer</label>
              <input value={filters.customer} onChange={e => set('customer', e.target.value)}
                placeholder="Search customer"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Location</label>
              <input value={filters.location} onChange={e => set('location', e.target.value)}
                placeholder="Search location"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</label>
            <select value={filters.status} onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
              <option value="">All statuses</option>
              {['started', 'submitted', 'approved', 'rejected'].map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <button onClick={runReport} disabled={loading}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
            {loading ? 'Running...' : '🔍 Run Report'}
          </button>
        </div>

        {tickets.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Tickets', value: tickets.length },
                { label: 'Total Weight', value: `${totalWeight.toFixed(0)}t` },
                { label: 'Approved', value: tickets.filter(t => t.status === 'approved').length },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-800">{t.customer_name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                      t.status === 'approved' ? 'bg-green-100 text-green-700' :
                      t.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                      t.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{t.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">👤 {t.drivers?.name}</p>
                  <p className="text-sm text-gray-400">📅 {new Date(t.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-400">📍 {t.location_loaded || '—'}</p>
                  {t.boxes?.length > 0 && (
                    <p className="text-sm text-[#2D7A5F] font-medium mt-1">
                      {t.boxes.length} boxes · {t.boxes.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0)} tons
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tickets.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>Run a report to see tickets</p>
          </div>
        )}
      </div>
    </div>
  )
}
