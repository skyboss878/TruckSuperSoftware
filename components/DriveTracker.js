'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Haversine distance in miles ──────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Bearing between two points (degrees) ─────────────────
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180) - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ── Kalman filter for smooth GPS ─────────────────────────
class KalmanFilter {
  constructor() { this.R = 0.01; this.Q = 3; this.P = 1; this.x = null; this.k = 0 }
  filter(z) {
    if (this.x === null) { this.x = z; return z }
    this.k = this.P / (this.P + this.R)
    this.x = this.x + this.k * (z - this.x)
    this.P = (1 - this.k) * this.P + this.Q
    return this.x
  }
}

// ── Reverse geocode state ─────────────────────────────────
const stateCache = {}
async function getState(lat, lon) {
  const key = `${Math.round(lat*10)/10},${Math.round(lon*10)/10}`
  if (stateCache[key]) return stateCache[key]
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
    const data = await res.json()
    const state = data.address?.state_code || data.address?.state || 'Unknown'
    stateCache[key] = state
    return state
  } catch { return 'Unknown' }
}

// ── Map tile math ─────────────────────────────────────────
const TILE_ZOOM = 16
function tilePosition(lat, lon, z = TILE_ZOOM) {
  const n = Math.pow(2, z)
  const xTile = (lon + 180) / 360 * n
  const latRad = lat * Math.PI / 180
  const yTile = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  const x = Math.floor(xTile)
  const y = Math.floor(yTile)
  return { x, y, z, fx: xTile - x, fy: yTile - y }
}
function tileUrl(x, y, z) {
  const subdomains = ['a', 'b', 'c', 'd']
  const s = subdomains[(x + y) % subdomains.length]
  return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`
}

export default function DriveTracker({ driver, onSessionComplete }) {
  const [status, setStatus] = useState('idle') // idle | starting | active | paused | done
  const [miles, setMiles] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [heading, setHeading] = useState(0)
  const [accuracy, setAccuracy] = useState(null)
  const [currentState, setCurrentState] = useState('')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [stateMiles, setStateMiles] = useState({})
  const [signal, setSignal] = useState('good') // good | ok | weak | lost
  const [tilePos, setTilePos] = useState(null)

  const watchIdRef = useRef(null)
  const sessionIdRef = useRef(null)
  const tripIdRef = useRef(null)
  const pointsRef = useRef([])
  const stateMilesRef = useRef({})
  const startTimeRef = useRef(null)
  const timerRef = useRef(null)
  const wakeLockRef = useRef(null)
  const speedBufferRef = useRef([])
  const kalmanLat = useRef(new KalmanFilter())
  const kalmanLon = useRef(new KalmanFilter())

  // ── Wake Lock — keep screen on ──────────────────────────
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {}
  }

  // ── Start session ────────────────────────────────────────
  async function startSession() {
    setStatus('starting')
    setError('')
    await requestWakeLock()

    if (!navigator.geolocation) {
      setError('GPS not available on this device')
      setStatus('idle')
      return
    }

    function gotPosition(pos) {
      const lat = kalmanLat.current.filter(pos.coords.latitude)
      const lon = kalmanLon.current.filter(pos.coords.longitude)
      handleInitialPosition(lat, lon)
    }

    function handleHighAccuracyError() {
      navigator.geolocation.getCurrentPosition(gotPosition, (err2) => {
        setError('Could not get location: ' + err2.message + ' (try going outdoors or enabling GPS)')
        setStatus('idle')
      }, { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 })
    }

    async function handleInitialPosition(lat, lon) {
      const state = await getState(lat, lon)
      setCurrentState(state)
      setTilePos(tilePosition(lat, lon))

      const { data } = await supabase.from('drive_sessions').insert({
        driver_id: driver.id,
        truck_number: driver.truck_number,
        start_time: new Date().toISOString(),
        status: 'active',
        gps_points: [{ lat, lon, timestamp: Date.now(), state }],
        state_miles: [],
        total_miles: 0,
      }).select().single()

      sessionIdRef.current = data?.id

      // Also create driver_trips record for admin Live Fleet Map
      const { data: tripData } = await supabase.from('driver_trips').insert({
        driver_id: driver.id,
        status: 'active',
        last_lat: lat,
        last_lng: lon,
        last_seen: new Date().toISOString(),
        total_miles: 0,
      }).select().single()
      tripIdRef.current = tripData?.id

      pointsRef.current = [{ lat, lon, timestamp: Date.now(), state }]
      startTimeRef.current = Date.now()
      stateMilesRef.current = {}

      setStatus('active')

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      startGPS()
    }

    navigator.geolocation.getCurrentPosition(gotPosition, handleHighAccuracyError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  }

  // ── GPS Watch ─────────────────────────────────────────────
  function startGPS() {
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const rawLat = pos.coords.latitude
        const rawLon = pos.coords.longitude
        const acc = pos.coords.accuracy
        const rawSpeed = pos.coords.speed

        setAccuracy(Math.round(acc))
        setSignal(acc < 20 ? 'good' : acc < 50 ? 'ok' : 'weak')

        const lat = kalmanLat.current.filter(rawLat)
        const lon = kalmanLon.current.filter(rawLon)

        setTilePos(tilePosition(lat, lon))

        const points = pointsRef.current
        const last = points[points.length - 1]
        if (!last) return

        const dist = haversine(last.lat, last.lon, lat, lon)
        const hdg = dist > 0.001 ? bearing(last.lat, last.lon, lat, lon) : heading
        setHeading(hdg)

        let spd = 0
        if (rawSpeed !== null && rawSpeed >= 0) {
          spd = rawSpeed * 2.237
        } else {
          const dt = (Date.now() - (last.timestamp || Date.now())) / 3600000
          spd = dt > 0 ? dist / dt : 0
        }

        speedBufferRef.current.push(spd)
        if (speedBufferRef.current.length > 5) speedBufferRef.current.shift()
        const avgSpeed = speedBufferRef.current.reduce((a, b) => a + b, 0) / speedBufferRef.current.length
        setSpeed(Math.round(avgSpeed))

        if (dist < 0.005) return

        const state = await getState(lat, lon)
        setCurrentState(state)

        const newPoint = { lat, lon, timestamp: Date.now(), state, dist, speed: Math.round(avgSpeed), accuracy: Math.round(acc) }
        pointsRef.current = [...points, newPoint]

        stateMilesRef.current[state] = (stateMilesRef.current[state] || 0) + dist
        const totalMiles = Object.values(stateMilesRef.current).reduce((a, b) => a + b, 0)
        setMiles(totalMiles)
        setStateMiles({ ...stateMilesRef.current })

        if (pointsRef.current.length % 3 === 0) {
          const stateMilesArray = Object.entries(stateMilesRef.current).map(([s, m]) => ({ state: s, miles: parseFloat(m.toFixed(2)) }))
          await supabase.from('drive_sessions').update({
            gps_points: pointsRef.current,
            state_miles: stateMilesArray,
            total_miles: parseFloat(totalMiles.toFixed(2)),
            current_lat: lat, current_lon: lon,
            current_speed: Math.round(avgSpeed),
          }).eq('id', sessionIdRef.current)

          await supabase.from('driver_locations').upsert({
            driver_id: driver.id,
            latitude: lat, longitude: lon,
            speed: Math.round(avgSpeed),
            heading: Math.round(hdg),
            accuracy: Math.round(acc),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'driver_id' })

          if (tripIdRef.current) {
            await supabase.from('driver_trips').update({
              last_lat: lat,
              last_lng: lon,
              last_seen: new Date().toISOString(),
              total_miles: parseFloat(totalMiles.toFixed(2)),
              state,
              state_miles: stateMilesArray,
            }).eq('id', tripIdRef.current)
          }
        }
      },
      (err) => {
        setSignal('lost')
        console.error('GPS error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000, distanceFilter: 0 }
    )
  }

  // ── Stop session ─────────────────────────────────────────
  async function stopSession() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    clearInterval(timerRef.current)
    wakeLockRef.current?.release?.()

    const stateMilesArray = Object.entries(stateMilesRef.current).map(([s, m]) => ({ state: s, miles: parseFloat(m.toFixed(2)) }))
    const totalMiles = parseFloat(miles.toFixed(2))

    await supabase.from('drive_sessions').update({
      status: 'completed',
      end_time: new Date().toISOString(),
      total_miles: totalMiles,
      state_miles: stateMilesArray,
      gps_points: pointsRef.current,
    }).eq('id', sessionIdRef.current)

    if (tripIdRef.current) {
      await supabase.from('driver_trips').update({
        status: 'ended',
        end_time: new Date().toISOString(),
        total_miles: totalMiles,
      }).eq('id', tripIdRef.current)
    }

    if (stateMilesArray.length > 0) {
      const startDate = new Date(startTimeRef.current)
      const endDate = new Date()
      const fmtTime = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`

      await supabase.from('timesheets').insert({
        driver_id: driver.id,
        log_type: 'working',
        location: stateMilesArray.map(s => s.state).join(', '),
        date: startDate.toISOString().split('T')[0],
        start_time: fmtTime(startDate),
        end_time: fmtTime(endDate),
        odometer_start: null,
        odometer_end: null,
        state_miles: stateMilesArray,
        source: 'gps_auto',
      })
    }

    setStatus('done')
    onSessionComplete?.()
  }

  function formatTime(s) {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
  }

  const signalColor = signal === 'good' ? '#22c55e' : signal === 'ok' ? '#f59e0b' : '#ef4444'
  const signalLabel = signal === 'good' ? 'Strong' : signal === 'ok' ? 'OK' : signal === 'lost' ? 'Lost' : 'Weak'

  if (status === 'idle' || status === 'starting') {
    return (
      <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #0d2419)', borderRadius: '20px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(45,122,95,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>🛣️</span>
          <div>
            <p style={{ color: 'white', fontWeight: '800', fontSize: '16px', margin: 0 }}>Trip Tracker</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>GPS · Speed · State Miles · IFTA</p>
          </div>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}
        <button onClick={startSession} disabled={status === 'starting'}
          style={{ width: '100%', padding: '14px', background: status === 'starting' ? 'rgba(45,122,95,0.4)' : '#2D7A5F', border: 'none', borderRadius: '14px', color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
          {status === 'starting' ? '📡 Getting GPS...' : '🚛 Start Trip'}
        </button>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #0d2419)', borderRadius: '20px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(45,122,95,0.3)', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
        <p style={{ color: 'white', fontWeight: '800', fontSize: '18px', margin: '0 0 4px' }}>Trip Complete</p>
        <p style={{ color: '#4ade80', fontSize: '24px', fontWeight: '900', margin: '0 0 4px' }}>{miles.toFixed(1)} mi</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 16px' }}>{formatTime(elapsed)} · {Object.keys(stateMiles).length} state{Object.keys(stateMiles).length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setStatus('idle'); setMiles(0); setElapsed(0); setStateMiles({}); setTilePos(null) }}
          style={{ padding: '12px 24px', background: '#2D7A5F', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
          New Trip
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #080d1a, #0d2137)', borderRadius: '20px', marginBottom: '16px', overflow: 'hidden', border: '1px solid rgba(45,122,95,0.4)' }}>
      {/* Map tile with truck overlay */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '70%', overflow: 'hidden', background: '#ddd' }}>
        {tilePos && (
          <img
            key={`${tilePos.x}-${tilePos.y}`}
            src={tileUrl(tilePos.x, tilePos.y, tilePos.z)}
            alt="Map"
            style={{ position: 'absolute', top: '50%', left: '50%', width: '200%', height: '200%', transform: 'translate(-50%, -50%)', objectFit: 'cover' }}
          />
        )}
        {tilePos && (
          <div style={{
            position: 'absolute',
            left: `${tilePos.fx * 100}%`,
            top: `${tilePos.fy * 100}%`,
            transform: `translate(-50%, -50%) rotate(${heading}deg)`,
            width: '36px', height: '36px', background: '#2D7A5F', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            boxShadow: '0 0 12px rgba(45,122,95,0.8)', border: '2px solid white', transition: 'left 0.5s linear, top 0.5s linear',
          }}>
            🚛
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'MPH', value: speed, icon: '⚡' },
            { label: 'Miles', value: miles.toFixed(1), icon: '🛣️' },
            { label: 'Time', value: formatTime(elapsed), icon: '⏱️' },
            { label: 'State', value: currentState || '...', icon: '📍' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', marginBottom: '2px' }}>{s.icon}</div>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: signalColor, animation: 'pulse 1.5s infinite' }} />
            <span style={{ color: signalColor, fontSize: '11px', fontWeight: '600' }}>GPS {signalLabel}</span>
            {accuracy && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>±{accuracy}m</span>}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
            {Object.entries(stateMiles).map(([s, m]) => `${s}: ${m.toFixed(1)}mi`).join(' · ')}
          </span>
        </div>

        <button onClick={stopSession}
          style={{ width: '100%', padding: '13px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '14px', color: '#ef4444', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>
          ⏹ End Trip
        </button>
      </div>
    </div>
  )
}
