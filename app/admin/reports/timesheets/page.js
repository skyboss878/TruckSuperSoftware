'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TimesheetsReport() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [filters, setFilters] = useState({ driver_id: '', start_date: '', end_date: '', log_type: '' })

  useEffect(() => {
    authFetch('/api/me').then(r => r.json()).then(d => { if (d?.company?.name) setCompanyName(d.company.name) })
    loadDrivers() }, [])

  async function loadDrivers() {
    const data = await fetch('/api/drivers').then(r=>r.json())
    setDrivers(data || [])
  }

  function set(field, value) { setFilters(f => ({ ...f, [field]: value })) }

  async function runReport() {
    setLoading(true)
    let url = '/api/timesheets'
    const params = new URLSearchParams()
    if (filters.driver_id) query = query.eq('driver_id', filters.driver_id)
    if (filters.start_date) query = query.gte('date', filters.start_date)
    if (filters.end_date) query = query.lte('date', filters.end_date)
    if (filters.log_type) query = query.eq('log_type', filters.log_type)
    const { data } = await query
    setTimesheets(data || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Driver', 'Log Type', 'Location', 'Start Time', 'End Time', 'Odometer Start', 'Odometer End', 'Total Miles', 'Status'],
      ...timesheets.map(ts => {
        const miles = ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0
        return [ts.date, ts.drivers?.name, ts.log_type, ts.location, ts.start_time, ts.end_time, ts.odometer_start, ts.odometer_end, miles, ts.status]
      })
    ]
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheets_report.csv`
    a.click()
  }

  const totalMiles = timesheets.reduce((s, ts) =>
    s + (ts.state_miles?.reduce((sm, m) => sm + (parseInt(m.miles) || 0), 0) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Timesheet Report</h1>
        {timesheets.length > 0 && (
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
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Log Type</label>
            <select value={filters.log_type} onChange={e => set('log_type', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 bg-white outline-none focus:border-[#2D7A5F]">
              <option value="">All types</option>
              <option value="working">Working</option>
              <option value="time_off">Time Off / Broke Down</option>
            </select>
          </div>
          <button onClick={runReport} disabled={loading}
            className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
            {loading ? 'Running...' : '🔍 Run Report'}
          </button>
        </div>

        {timesheets.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Records', value: timesheets.length },
                { label: 'Total Miles', value: totalMiles.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {timesheets.map(ts => {
                const miles = ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0
                return (
                  <div key={ts.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{ts.drivers?.name}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full capitalize">
                        {ts.log_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">📅 {new Date(ts.date).toLocaleDateString()}</p>
                    {ts.location && <p className="text-sm text-gray-400">📍 {ts.location}</p>}
                    <p className="text-sm text-gray-400">🕐 {ts.start_time} → {ts.end_time || 'ongoing'}</p>
                    {miles > 0 && <p className="text-sm text-[#2D7A5F] font-medium">🛣️ {miles} miles</p>}
                    {ts.state_miles?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ts.state_miles.map((sm, i) => sm.state && (
                          <span key={i} className="text-xs bg-[#E8F5F0] text-[#2D7A5F] px-2 py-0.5 rounded-full">
                            {sm.state}: {sm.miles}mi
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!loading && timesheets.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🕐</div>
            <p>Run a report to see timesheets</p>
          </div>
        )}
      </div>
    </div>
  )
}
