'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/api-client'

export default function DriverTracking() {
  const router = useRouter()
  const [driver, setDriver] = useState(null)
  const [trip, setTrip] = useState(null)
  const [miles, setMiles] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState('idle') // idle | tracking | ended
  const [gpsStatus, setGpsStatus] = useState('waiting')
  const [panicSent, setPanicSent] = useState(false)
  const [lastLocation, setLastLocation] = useState(null)
  const [currentState, setCurrentState] = useState(null)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const watchRef = useRef(null)
  const intervalRef = useRef(null)
  const tripRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const d = await authFetch(`/api/drivers?auth_id=${user.id}`).then(r => r.json())
      setDriver(d)
    }
    init()
    return () => stopTracking()
  }, [])

  useEffect(() => {
    if (status === 'tracking') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [status])

  function formatTime(secs) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  async function detectState(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      const state = data.address?.state_code || data.address?.state || null
      if (state) setCurrentState(state.toUpperCase().slice(0, 2))
    } catch {}
  }

  async function startTrip() {
    if (!driver) return
    setGpsStatus('requesting')

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      setLastLocation({ lat, lng })
      setGpsStatus('active')

      const tripData = await authFetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_trip', driver_id: driver.id, lat, lng }),
      }).then(r => r.json())

      setTrip(tripData)
      tripRef.current = tripData
      setStatus('tracking')
      setElapsed(0)
      setMiles(0)

      // Watch position
      watchRef.current = navigator.geolocation.watchPosition(
        async (p) => {
          const { latitude, longitude, speed, accuracy } = p.coords
          setLastLocation({ lat: latitude, lng: longitude })
          setGpsStatus('active')

          const result = await authFetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_location',
              driver_id: driver.id,
              trip_id: tripRef.current?.id,
              lat: latitude,
              lng: longitude,
              speed,
              accuracy,
            }),
          }).then(r => r.json())

          if (result.miles !== undefined) setMiles(result.miles)
        },
        (err) => setGpsStatus('error'),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
      )
    }, () => setGpsStatus('error'), { enableHighAccuracy: true })
  }

  function stopTracking() {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    clearInterval(intervalRef.current)
  }

  async function endTrip() {
    stopTracking()
    if (tripRef.current?.id) {
      await authFetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_trip', trip_id: tripRef.current.id, driver_id: driver.id }),
      })
    }
    setStatus('ended')
    setGpsStatus('idle')
  }

  async function sendPanic() {
    if (!driver || panicSent) return
    const loc = lastLocation || { lat: 0, lng: 0 }
    await authFetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'panic',
        driver_id: driver.id,
        trip_id: tripRef.current?.id,
        lat: loc.lat,
        lng: loc.lng,
      }),
    })
    setPanicSent(true)
    setTimeout(() => setPanicSent(false), 30000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Trip Tracking</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-4">

        {/* GPS Status */}
        <div className={`rounded-2xl p-3 flex items-center gap-3 ${
          gpsStatus === 'active' ? 'bg-green-50' :
          gpsStatus === 'error'  ? 'bg-red-50'   : 'bg-gray-100'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            gpsStatus === 'active'    ? 'bg-green-500 animate-pulse' :
            gpsStatus === 'error'     ? 'bg-red-500'  :
            gpsStatus === 'requesting'? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <p className="text-sm font-medium text-gray-700">
            {gpsStatus === 'active'     ? 'GPS Active — Location updating' :
             gpsStatus === 'error'      ? 'GPS Error — Check location permissions' :
             gpsStatus === 'requesting' ? 'Requesting GPS...' : 'GPS Ready'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-[#2D7A5F]">{miles.toFixed(1)}</p>
            <p className="text-sm text-gray-400 mt-1">Miles Driven</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-[#2D7A5F]">{formatTime(elapsed)}</p>
            <p className="text-sm text-gray-400 mt-1">Trip Time</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${currentSpeed > 75 ? 'bg-red-50' : 'bg-white'}`}>
            <p className={`text-3xl font-bold ${currentSpeed > 75 ? 'text-red-500' : 'text-[#2D7A5F]'}`}>{currentSpeed}</p>
            <p className={`text-sm mt-1 ${currentSpeed > 75 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
              {currentSpeed > 75 ? '⚠️ Speed MPH' : 'Speed MPH'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-[#2D7A5F]">{currentState || '—'}</p>
            <p className="text-sm text-gray-400 mt-1">Current State</p>
          </div>
        </div>

        {/* Location */}
        {lastLocation && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Current Location</p>
            <p className="text-sm text-gray-700 font-mono">{lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}</p>
            <a href={`https://maps.google.com/?q=${lastLocation.lat},${lastLocation.lng}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-[#2D7A5F] font-medium mt-1 block">
              Open in Maps →
            </a>
          </div>
        )}

        {/* Controls */}
        {status === 'idle' && (
          <button onClick={startTrip}
            className="w-full bg-[#2D7A5F] text-white py-5 rounded-2xl font-bold text-lg shadow-lg active:opacity-80">
            🚛 Start Trip
          </button>
        )}

        {status === 'tracking' && (
          <button onClick={endTrip}
            className="w-full bg-gray-800 text-white py-5 rounded-2xl font-bold text-lg shadow-lg active:opacity-80">
            ⏹ End Trip — {miles.toFixed(1)} mi
          </button>
        )}

        {status === 'ended' && (
          <div className="bg-green-50 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-bold text-gray-800">Trip Complete</p>
            <p className="text-gray-500 text-sm mt-1">{miles.toFixed(1)} miles · {formatTime(elapsed)}</p>
            <button onClick={() => { setStatus('idle'); setMiles(0); setElapsed(0); setTrip(null); tripRef.current = null }}
              className="mt-4 w-full bg-[#2D7A5F] text-white py-3 rounded-2xl font-semibold">
              Start New Trip
            </button>
          </div>
        )}

        {/* Panic Button */}
        {status === 'tracking' && (
          <button onClick={sendPanic} disabled={panicSent}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all ${
              panicSent ? 'bg-gray-300 text-gray-500' : 'bg-red-600 text-white active:opacity-80'
            }`}>
            {panicSent ? '✓ Help Alert Sent — Dispatching' : '🆘 PANIC — Send My Location'}
          </button>
        )}

        {panicSent && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="font-bold text-red-700">🚨 Alert Sent to Dispatch</p>
            <p className="text-sm text-red-500 mt-1">Your location has been shared. Help is on the way.</p>
          </div>
        )}
      </div>
    </div>
  )
}
