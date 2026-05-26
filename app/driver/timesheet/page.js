'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LOG_TYPES = [
  { value: 'working', label: 'Working', icon: '🚛' },
  { value: 'time_off', label: 'Time Off / Broke Down', icon: '⏸️' },
]

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
]

export default function TimesheetPage() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [timesheets, setTimesheets] = useState([])
  const [tab, setTab] = useState('started')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    log_type: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    odometer_start: '',
    odometer_end: '',
    state_miles: [{ state: '', miles: '' }],
  })

  useEffect(() => { loadDriver() }, [])
  useEffect(() => { if (driver) loadTimesheets() }, [driver, tab])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('drivers').select('*').eq('auth_id', user.id).single()
    setDriver(data)
  }

  async function loadTimesheets() {
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', tab)
      .order('date', { ascending: false })
    setTimesheets(data || [])
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function addStateMiles() {
    setForm(f => ({ ...f, state_miles: [...f.state_miles, { state: '', miles: '' }] }))
  }

  function removeStateMiles(i) {
    setForm(f => ({ ...f, state_miles: f.state_miles.filter((_, idx) => idx !== i) }))
  }

  function setStateMile(i, field, value) {
    setForm(f => {
      const state_miles = [...f.state_miles]
      state_miles[i] = { ...state_miles[i], [field]: value }
      return { ...f, state_miles }
    })
  }

  const totalMiles = form.state_miles.reduce((sum, s) => sum + (parseInt(s.miles) || 0), 0)

  async function handleSave(submitStatus = 'started') {
    if (!form.log_type || !form.date || !form.start_time) return
    setSaving(true)

    const payload = {
      driver_id: driver.id,
      log_type: form.log_type,
      location: form.location,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      odometer_start: form.odometer_start ? parseInt(form.odometer_start) : null,
      odometer_end: form.odometer_end ? parseInt(form.odometer_end) : null,
      state_miles: form.state_miles.filter(s => s.state && s.miles),
      status: submitStatus,
      synced: true,
    }

    const isOnline = navigator.onLine
    if (!isOnline) {
      const offline = JSON.parse(localStorage.getItem('offline_timesheets') || '[]')
      offline.push({ ...payload, synced: false, id: crypto.randomUUID() })
      localStorage.setItem('offline_timesheets', JSON.stringify(offline))
      setShowForm(false)
      setSaving(false)
      return
    }

    await supabase.from('timesheets').insert(payload)
    setShowForm(false)
    setSaving(false)
    setForm({
      log_type: '', location: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '', end_time: '',
      odometer_start: '', odometer_end: '',
      state_miles: [{ state: '', miles: '' }],
    })
    loadTimesheets()
  }

  const grouped = timesheets.reduce((acc, ts) => {
    const date = new Date(ts.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(ts)
    return acc
  }, {})

  const logTypeLabel = { working: 'Working', time_off: 'Time Off / Broke Down' }
  const logTypeIcon = { working: '🚛', time_off: '⏸️' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">Time Sheet</h1>
        <div className="w-12" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b flex">
        {['started', 'submitted'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
              tab === t ? 'border-[#2D7A5F] text-[#2D7A5F]' : 'border-transparent text-gray-400'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 pb-24 space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🕐</div>
            <p className="text-lg font-medium">No timesheets found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs text-gray-400 font-medium mb-2">{date}</p>
              {items.map(ts => {
                const miles = ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0
                return (
                  <div key={ts.id} className="bg-white rounded-2xl p-4 mb-2 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span>{logTypeIcon[ts.log_type]}</span>
                        <p className="font-bold text-gray-800">{logTypeLabel[ts.log_type]}</p>
                      </div>
                      {miles > 0 && (
                        <span className="text-xs bg-[#E8F5F0] text-[#2D7A5F] px-2 py-1 rounded-full font-semibold">{miles} mi</span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {ts.location && (
                        <p className="text-sm text-gray-400">📍 {ts.location}</p>
                      )}
                      <p className="text-sm text-gray-400">
                        🕐 {ts.start_time} {ts.end_time ? `→ ${ts.end_time}` : ''}
                      </p>
                      {ts.odometer_start && (
                        <p className="text-sm text-gray-400">
                          🛣️ {ts.odometer_start?.toLocaleString()} → {ts.odometer_end?.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2D7A5F] rounded-full shadow-lg flex items-center justify-center text-white text-2xl active:opacity-80"
      >
        +
      </button>

      {/* Add Timesheet Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="border-b px-4 py-4 flex items-center justify-between">
            <button onClick={() => setShowForm(false)} className="text-gray-400">✕</button>
            <h2 className="font-bold text-gray-800">Add Time Sheet</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            {/* Log Type */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Log Type</label>
              <div className="mt-2 space-y-2">
                {LOG_TYPES.map(lt => (
                  <button key={lt.value} onClick={() => set('log_type', lt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                      form.log_type === lt.value
                        ? 'border-[#2D7A5F] bg-[#E8F5F0] text-[#2D7A5F]'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    <span>{lt.icon}</span>
                    <span className="font-medium">{lt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="e.g. Odessa TX"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Start Time</label>
                <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">End Time</label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>

            {/* Odometer */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Odometer (miles)</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <input type="number" value={form.odometer_start} onChange={e => set('odometer_start', e.target.value)}
                  placeholder="Start"
                  className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#2D7A5F]" />
                <input type="number" value={form.odometer_end} onChange={e => set('odometer_end', e.target.value)}
                  placeholder="End"
                  className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#2D7A5F]" />
              </div>
            </div>

            {/* State Miles */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Miles by State {totalMiles > 0 && <span className="text-[#2D7A5F]">({totalMiles} total)</span>}
                </label>
                <button onClick={addStateMiles} className="text-[#2D7A5F] text-sm font-semibold">+ Add</button>
              </div>
              {form.state_miles.map((sm, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <select value={sm.state} onChange={e => setStateMile(i, 'state', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-[#2D7A5F] bg-white">
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" value={sm.miles} onChange={e => setStateMile(i, 'miles', e.target.value)}
                    placeholder="Miles"
                    className="w-24 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-[#2D7A5F]" />
                  {form.state_miles.length > 1 && (
                    <button onClick={() => removeStateMiles(i)}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold flex-shrink-0">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
            <button onClick={() => handleSave('started')} disabled={saving}
              className="flex-1 border-2 border-[#2D7A5F] text-[#2D7A5F] py-4 rounded-2xl font-semibold disabled:opacity-40">
              Save
            </button>
            <button onClick={() => handleSave('submitted')} disabled={saving}
              className="flex-1 bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
