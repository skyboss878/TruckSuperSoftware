'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Calculate distance between two GPS points in miles
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Reverse geocode to get state from lat/lon
async function getState(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'SmithsFreightHub/1.0' } }
    )
    const data = await res.json()
    return data.address?.state || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

export default function DriveTracker({ driver, onSessionComplete }) {
  const [session, setSession] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [miles, setMiles] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [currentState, setCurrentState] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pointsRef = useRef([])
  const stateMilesRef = useRef({})
  const watchIdRef = useRef(null)
  const timerRef = useRef(null)
  const lastStateRef = useRef('')
  const sessionIdRef = useRef(null)

  useEffect(() => {
    // Check for active session on mount
    checkActiveSession()
    return () => stopTracking()
  }, [])

  async function checkActiveSession() {
    // Check localStorage first for fast resume
    const saved = localStorage.getItem('active_drive')
    
    const { data } = await supabase
      .from('drive_sessions')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', 'active')
      .single()

    if (data) {
      setSession(data)
      sessionIdRef.current = data.id
      pointsRef.current = data.gps_points || []
      stateMilesRef.current = Object.fromEntries(
        (data.state_miles || []).map(s => [s.state, s.miles])
      )
      setMiles(data.total_miles || 0)
      // Calculate elapsed from actual start time
      const startTime = data.started_at || (saved ? JSON.parse(saved).startedAt : new Date().toISOString())
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      setElapsed(elapsed)
      resumeTracking(data)
    } else {
      // No active session - clear localStorage
      localStorage.removeItem('active_drive')
    }
  }

  function resumeTracking(existingSession) {
    setTracking(true)
    startGPS()
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
  }

  async function startDrive() {
    if (!navigator.geolocation) {
      setError('GPS not available on this device')
      return
    }
    setLoading(true)
    setError('')

    // Get initial position
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      const state = await getState(latitude, longitude)

      const firstPoint = {
        lat: latitude,
        lon: longitude,
        timestamp: Date.now(),
        state,
      }

      pointsRef.current = [firstPoint]
      stateMilesRef.current = { [state]: 0 }
      lastStateRef.current = state
      setCurrentState(state)

      // Create session in Supabase
      const { data, error } = await supabase
        .from('drive_sessions')
        .insert({
          driver_id: driver.id,
          status: 'active',
          gps_points: [firstPoint],
          state_miles: [{ state, miles: 0 }],
          total_miles: 0,
        })
        .select()
        .single()

      if (error) {
        setError('Failed to start session: ' + error.message)
        setLoading(false)
        return
      }

      setSession(data)
      sessionIdRef.current = data.id
      // Save to localStorage so app can resume after background
      localStorage.setItem('active_drive', JSON.stringify({
        sessionId: data.id,
        startedAt: data.started_at || new Date().toISOString(),
        driverId: driver.id,
      }))
      setTracking(true)
      setLoading(false)

      startGPS()
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1)
      }, 1000)
    }, (err) => {
      setError('GPS error: ' + err.message)
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  function startGPS() {
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const points = pointsRef.current
        const last = points[points.length - 1]

        if (!last) return

        const dist = haversineDistance(last.lat, last.lon, latitude, longitude)

        // Only record if moved more than 0.01 miles
        if (dist < 0.01) return

        const state = await getState(latitude, longitude)
        lastStateRef.current = state
        setCurrentState(state)

        const newPoint = {
          lat: latitude,
          lon: longitude,
          timestamp: Date.now(),
          state,
          dist,
        }

        pointsRef.current = [...points, newPoint]

        // Update state miles
        stateMilesRef.current[state] = (stateMilesRef.current[state] || 0) + dist

        const totalMiles = Object.values(stateMilesRef.current).reduce((a, b) => a + b, 0)
        setMiles(totalMiles)

        const stateMilesArray = Object.entries(stateMilesRef.current).map(([state, miles]) => ({
          state,
          miles: parseFloat(miles.toFixed(2)),
        }))

        // Update Supabase every 5 points
        if (pointsRef.current.length % 5 === 0) {
          await supabase
            .from('drive_sessions')
            .update({
              gps_points: pointsRef.current,
              state_miles: stateMilesArray,
              total_miles: parseFloat(totalMiles.toFixed(2)),
            })
            .eq('id', sessionIdRef.current)
        }
      },
      (err) => console.error('GPS watch error:', err),
      { enableHighAccuracy: true, distanceFilter: 50 }
    )
  }

  function stopTracking() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function endDrive() {
    setLoading(true)
    stopTracking()

    const totalMiles = Object.values(stateMilesRef.current).reduce((a, b) => a + b, 0)
    const stateMilesArray = Object.entries(stateMilesRef.current).map(([state, miles]) => ({
      state,
      miles: parseFloat(miles.toFixed(2)),
    }))

    // Final update to session
    await supabase
      .from('drive_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        gps_points: pointsRef.current,
        state_miles: stateMilesArray,
        total_miles: parseFloat(totalMiles.toFixed(2)),
      })
      .eq('id', sessionIdRef.current)

    // Auto-create timesheet via API
    const startedAt = session.started_at
    const startTime = new Date(startedAt).toTimeString().slice(0, 5)
    const endTime = new Date().toTimeString().slice(0, 5)
    const date = new Date(startedAt).toISOString().split('T')[0]

    const tsRes = await fetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: driver.id,
        log_type: 'working',
        date,
        start_time: startTime,
        end_time: endTime,
        state_miles: stateMilesArray,
        status: 'started',
        synced: true,
      }),
    })
    const ts = await tsRes.json()

    setTracking(false)
    setSession(null)
    setMiles(0)
    setElapsed(0)
    setCurrentState('')
    pointsRef.current = []
    stateMilesRef.current = {}
    sessionIdRef.current = null
    localStorage.removeItem('active_drive')
    setLoading(false)

    if (onSessionComplete) onSessionComplete(ts)
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  }

  if (!tracking) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-1">GPS Drive Tracker</h3>
        <p className="text-xs text-gray-400 mb-4">Auto-tracks miles by state and creates your timesheet</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={startDrive}
          disabled={loading}
          className="w-full bg-[#2D7A5F] text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Getting GPS...
            </>
          ) : '🚛 Start Drive'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#2D7A5F] rounded-2xl p-4 shadow-sm text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <span className="font-bold">Drive Active</span>
        </div>
        <span className="text-green-200 text-sm">{currentState}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{miles.toFixed(1)}</p>
          <p className="text-green-200 text-xs">Miles</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{formatTime(elapsed)}</p>
          <p className="text-green-200 text-xs">Time</p>
        </div>
      </div>

      {Object.keys(stateMilesRef.current).length > 0 && (
        <div className="bg-white/10 rounded-xl p-3 mb-4">
          <p className="text-green-200 text-xs font-medium mb-2">Miles by State</p>
          {Object.entries(stateMilesRef.current).map(([state, m]) => (
            <div key={state} className="flex justify-between text-sm">
              <span>{state}</span>
              <span className="font-bold">{m.toFixed(1)} mi</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={endDrive}
        disabled={loading}
        className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-40"
      >
        {loading ? 'Saving...' : '🛑 End Drive'}
      </button>
    </div>
  )
}
