'use client'
import { authFetch } from '@/lib/api-client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUS = {
  OFF: { label: 'Off Duty', color: 'bg-gray-500', light: 'bg-gray-50', text: 'text-gray-600', icon: '🌙' },
  SB:  { label: 'Sleeper Berth', color: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', icon: '😴' },
  D:   { label: 'Driving', color: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', icon: '🚛' },
  ON:  { label: 'On Duty', color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', icon: '⚙️' },
}

const HOS_RULES = {
  MAX_DRIVE: 11 * 3600,
  MAX_DUTY_WINDOW: 14 * 3600,
  BREAK_AFTER: 8 * 3600,
  BREAK_DURATION: 30 * 60,
  WEEKLY_LIMIT: 70 * 3600,
  QUALIFYING_REST: 10 * 3600,
}

function formatHMS(s) {
  if (s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function formatHM(s) {
  if (s < 0) return '0h 0m'
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`
}

export default function HOSLogger() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('OFF')
  const [statusStart, setStatusStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (statusStart) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(statusStart).getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [statusStart])

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const d = await authFetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
      setDriver(d)
      await loadLogs(d.id)
    } catch (err) {
      setError('Failed to load HOS data')
    }
    setLoading(false)
  }

  async function loadLogs(driverId) {
    const weekAgo = new Date(Date.now() - 8 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('hos_logs')
      .select('*')
      .eq('driver_id', driverId)
      .gte('started_at', weekAgo)
      .order('started_at', { ascending: false })

    if (error) { setError('Failed to load logs'); return }
    const allLogs = data || []
    setLogs(allLogs)

    const active = allLogs.find(l => !l.ended_at)
    if (active) {
      setCurrentStatus(active.status)
      setStatusStart(active.started_at)
      setElapsed(Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000))
    } else {
      setStatusStart(new Date().toISOString())
      setElapsed(0)
    }
  }

  // Find duty window start — when driver first came ON/D after 10+ hrs rest
  function getDutyWindowStart(allLogs) {
    const sorted = [...allLogs].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    
    // Find last qualifying rest (10+ hours OFF or SB)
    let lastRestEnd = null
    for (let i = 0; i < sorted.length - 1; i++) {
      const log = sorted[i]
      const next = sorted[i + 1]
      if ((log.status === 'OFF' || log.status === 'SB') && log.ended_at) {
        const restDuration = (new Date(log.ended_at) - new Date(log.started_at)) / 1000
        if (restDuration >= HOS_RULES.QUALIFYING_REST) {
          lastRestEnd = new Date(log.ended_at)
        }
      }
    }

    // Duty window starts at first ON/D after last qualifying rest
    if (lastRestEnd) {
      const firstOnDuty = sorted.find(l =>
        (l.status === 'D' || l.status === 'ON') &&
        new Date(l.started_at) >= lastRestEnd
      )
      if (firstOnDuty) return new Date(firstOnDuty.started_at)
    }

    // Fallback: midnight today
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    return midnight
  }

  function calcTotals() {
    const now = Date.now()
    const weekStart = new Date(now - 8 * 86400000)
    const dutyWindowStart = getDutyWindowStart(logs)

    let driveToday = 0
    let dutyWindowUsed = 0
    let driveWeek = 0
    let dutyWeek = 0
    let driveWithoutBreak = 0
    let lastBreakEnd = null

    const sorted = [...logs].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))

    for (const log of sorted) {
      const start = new Date(log.started_at).getTime()
      const end = log.ended_at ? new Date(log.ended_at).getTime() : now
      const duration = Math.floor((end - start) / 1000)
      const isDrive = log.status === 'D'
      const isOnDuty = log.status === 'D' || log.status === 'ON'
      const isRest = log.status === 'OFF' || log.status === 'SB'

      // 14-hour duty window
      if (start >= dutyWindowStart.getTime() && isOnDuty) {
        dutyWindowUsed += duration
      }

      // Drive time since duty window start
      if (start >= dutyWindowStart.getTime() && isDrive) {
        driveToday += duration
      }

      // Weekly totals
      if (start >= weekStart.getTime()) {
        if (isDrive) driveWeek += duration
        if (isOnDuty) dutyWeek += duration
      }

      // Break tracking — reset drive counter after 30+ min break
      if (isRest && duration >= HOS_RULES.BREAK_DURATION) {
        driveWithoutBreak = 0
        lastBreakEnd = end
      } else if (isDrive) {
        driveWithoutBreak += duration
      }
    }

    const needBreak = driveWithoutBreak >= HOS_RULES.BREAK_AFTER
    const dutyWindowRemaining = Math.max(0, HOS_RULES.MAX_DUTY_WINDOW - dutyWindowUsed)
    const dutyWindowExpires = new Date(dutyWindowStart.getTime() + HOS_RULES.MAX_DUTY_WINDOW)

    return {
      driveToday,
      dutyWindowUsed,
      dutyWeek,
      driveWeek,
      driveRemaining: Math.max(0, HOS_RULES.MAX_DRIVE - driveToday),
      dutyWindowRemaining,
      weeklyRemaining: Math.max(0, HOS_RULES.WEEKLY_LIMIT - dutyWeek),
      needBreak,
      driveWithoutBreak,
      dutyWindowStart,
      dutyWindowExpires,
      violation: driveToday > HOS_RULES.MAX_DRIVE || dutyWindowUsed > HOS_RULES.MAX_DUTY_WINDOW || dutyWeek > HOS_RULES.WEEKLY_LIMIT,
    }
  }

  async function changeStatus(newStatus) {
    if (newStatus === currentStatus || changing || !driver) return
    setChanging(true)
    setError('')

    const now = new Date().toISOString()
    try {
      // End current active log
      const activeLog = logs.find(l => !l.ended_at)
      if (activeLog) {
        const { error: updateErr } = await supabase
          .from('hos_logs')
          .update({ ended_at: now })
          .eq('id', activeLog.id)
        if (updateErr) throw updateErr
      }

      // Create new log
      const { error: insertErr } = await supabase
        .from('hos_logs')
        .insert({ driver_id: driver.id, status: newStatus, started_at: now })
      if (insertErr) throw insertErr

      setCurrentStatus(newStatus)
      setStatusStart(now)
      setElapsed(0)
      await loadLogs(driver.id)
    } catch (err) {
      setError('Failed to update status. Please try again.')
      console.error('HOS update error:', err)
    }
    setChanging(false)
  }

  const totals = calcTotals()
  const drivePercent = Math.min(100, (totals.driveToday / HOS_RULES.MAX_DRIVE) * 100)
  const dutyPercent = Math.min(100, (totals.dutyWindowUsed / HOS_RULES.MAX_DUTY_WINDOW) * 100)
  const weekPercent = Math.min(100, (totals.dutyWeek / HOS_RULES.WEEKLY_LIMIT) * 100)

  const todayLogs = logs.filter(l => {
    const logDate = new Date(l.started_at).toDateString()
    return logDate === new Date().toDateString()
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading HOS data...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Hours of Service</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4 pb-10">

        {/* Violation banner */}
        {totals.violation && (
          <div className="bg-red-600 rounded-2xl p-4 text-white text-center">
            <p className="text-2xl mb-1">🚨</p>
            <p className="font-bold text-lg">HOS VIOLATION</p>
            <p className="text-red-200 text-sm">You have exceeded federal limits. Pull over safely.</p>
          </div>
        )}

        {/* Break warning */}
        {totals.needBreak && currentStatus === 'D' && (
          <div className="bg-orange-500 rounded-2xl p-4 text-white text-center">
            <p className="font-bold">⚠️ 30-Minute Break Required</p>
            <p className="text-orange-100 text-sm mt-1">You have driven {formatHM(totals.driveWithoutBreak)} without a break</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Current status */}
        <div className={`rounded-2xl p-5 ${STATUS[currentStatus].light}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${STATUS[currentStatus].color} ${currentStatus === 'D' ? 'animate-pulse' : ''}`} />
              <span className={`font-bold ${STATUS[currentStatus].text}`}>
                {STATUS[currentStatus].icon} {STATUS[currentStatus].label}
              </span>
            </div>
            <span className="text-gray-400 text-xs">{driver?.name}</span>
          </div>
          <p className="text-4xl font-bold text-gray-800 text-center py-3">{formatHMS(elapsed)}</p>
          <p className="text-center text-gray-400 text-xs">Current status duration</p>
        </div>

        {/* Status buttons */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(STATUS).map(([key, val]) => (
            <button key={key} onClick={() => changeStatus(key)} disabled={changing}
              className={`rounded-2xl p-4 text-left transition-all active:opacity-80 ${
                currentStatus === key
                  ? `${val.color} text-white shadow-lg`
                  : 'bg-white text-gray-700 shadow-sm'
              } disabled:opacity-50`}>
              <p className="text-2xl mb-1">{val.icon}</p>
              <p className="font-bold text-sm">{val.label}</p>
              {currentStatus === key && <p className="text-xs opacity-75 mt-0.5">Active</p>}
            </button>
          ))}
        </div>

        {/* HOS Clocks */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Duty Window</h3>
            <p className="text-xs text-gray-400">
              Started {totals.dutyWindowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {[
            { label: 'Drive Time (11-hr limit)', used: totals.driveToday, remaining: totals.driveRemaining, max: HOS_RULES.MAX_DRIVE, pct: drivePercent },
            { label: '14-Hour Duty Window', used: totals.dutyWindowUsed, remaining: totals.dutyWindowRemaining, max: HOS_RULES.MAX_DUTY_WINDOW, pct: dutyPercent },
          ].map(g => (
            <div key={g.label}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{g.label}</span>
                <span className={`text-sm font-bold ${g.remaining < 3600 ? 'text-red-500' : 'text-gray-700'}`}>
                  {formatHM(g.remaining)} left
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${g.pct > 90 ? 'bg-red-500' : g.pct > 75 ? 'bg-orange-400' : 'bg-[#2D7A5F]'}`}
                  style={{ width: `${g.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Used {formatHM(g.used)} of {formatHM(g.max)}</p>
            </div>
          ))}
        </div>

        {/* Weekly clock */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <h3 className="font-bold text-gray-700">70-Hr / 8-Day Clock</h3>
            <span className={`text-sm font-bold ${totals.weeklyRemaining < 7200 ? 'text-red-500' : 'text-gray-600'}`}>
              {formatHM(totals.weeklyRemaining)} left
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${weekPercent > 90 ? 'bg-red-500' : weekPercent > 75 ? 'bg-orange-400' : 'bg-[#2D7A5F]'}`}
              style={{ width: `${weekPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Used {formatHM(totals.dutyWeek)} of 70 hours this week</p>
        </div>

        {/* ELD-style grid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">Today's Log Grid</h3>
          <div className="space-y-2">
            {Object.entries(STATUS).map(([key, val]) => {
              const statusLogs = todayLogs.filter(l => l.status === key)
              const totalSecs = statusLogs.reduce((sum, l) => {
                const start = new Date(l.started_at)
                const end = l.ended_at ? new Date(l.ended_at) : new Date()
                return sum + Math.floor((end - start) / 1000)
              }, 0)
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-center">{val.icon}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                    {statusLogs.map((l, i) => {
                      const dayStart = new Date()
                      dayStart.setHours(0, 0, 0, 0)
                      const start = Math.max(0, (new Date(l.started_at) - dayStart) / 86400000)
                      const end = Math.min(1, ((l.ended_at ? new Date(l.ended_at) : new Date()) - dayStart) / 86400000)
                      return (
                        <div key={i}
                          className={`absolute top-0 h-full ${val.color} opacity-80`}
                          style={{ left: `${start * 100}%`, width: `${(end - start) * 100}%` }} />
                      )
                    })}
                  </div>
                  <span className="text-xs text-gray-500 w-14 text-right">{formatHM(totalSecs)}</span>
                </div>
              )
            })}
            <div className="flex justify-between text-xs text-gray-300 mt-1 px-9">
              {['12a','4a','8a','12p','4p','8p','12a'].map(t => <span key={t}>{t}</span>)}
            </div>
          </div>
        </div>

        {/* Today's log list */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">Today's Entries</h3>
          {todayLogs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No entries today</p>
          ) : (
            <div className="space-y-2">
              {[...todayLogs].reverse().map(l => {
                const dur = l.ended_at
                  ? Math.floor((new Date(l.ended_at) - new Date(l.started_at)) / 1000)
                  : elapsed
                return (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-lg">{STATUS[l.status]?.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{STATUS[l.status]?.label}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(l.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {l.ended_at ? ` → ${new Date(l.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' → Now'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-600">{formatHM(dur)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-blue-800 text-xs font-medium">📋 FMCSA Property Carrier Rules</p>
          <p className="text-blue-700 text-xs mt-1">11-hr max driving · 14-hr duty window from first on-duty · 30-min break after 8hrs driving · 70-hr/8-day weekly limit · 10-hr qualifying rest resets duty window · 34-hr restart resets weekly</p>
        </div>
      </div>
    </div>
  )
}
