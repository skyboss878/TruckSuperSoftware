'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CACHE_KEY = 'fleet_map_cache'

export default function AdminTracking() {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markers = useRef({})
  const mapReady = useRef(false)
  const pendingData = useRef(null)

  useEffect(() => {
    // Show cached data immediately while fetching
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached)
        setDrivers(data)
        setLastUpdated(ts)
        setFromCache(true)
        setLoading(false)
      } catch {}
    }

    loadScript()
    loadDrivers()

    const interval = setInterval(loadDrivers, 30000)

    const handleOnline = () => { setIsOnline(true); loadDrivers() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    const channel = supabase
      .channel('driver-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_trips' }, loadDrivers)
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      supabase.removeChannel(channel)
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
        mapReady.current = false
        markers.current = {}
      }
    }
  }, [])

  function loadScript() {
    if (document.getElementById('leaflet-css')) {
      if (window.L) initMap()
      return
    }
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => initMap()
    document.head.appendChild(script)
  }

  function initMap() {
    if (leafletMap.current || !mapRef.current) return
    leafletMap.current = window.L.map(mapRef.current).setView([39.5, -98.35], 4)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(leafletMap.current)
    mapReady.current = true

    setTimeout(() => {
      leafletMap.current.invalidateSize()
    }, 300)

    if (pendingData.current) {
      updateMarkers(pendingData.current)
      pendingData.current = null
    }
  }

  async function loadDrivers() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/tracking')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

      setDrivers(arr)
      setLastUpdated(ts)
      setFromCache(false)
      setLoading(false)

      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: arr, ts }))

      if (mapReady.current) {
        updateMarkers(arr)
      } else {
        pendingData.current = arr
      }
    } catch (e) {
      console.error('Tracking fetch error:', e)
      setIsOnline(navigator.onLine)
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          const { data, ts } = JSON.parse(cached)
          setDrivers(data)
          setLastUpdated(ts)
          setFromCache(true)
          if (mapReady.current) updateMarkers(data)
          else pendingData.current = data
        } catch {}
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function updateMarkers(data) {
    if (!leafletMap.current || !window.L) return

    // Remove stale markers
    const activeIds = new Set(data.map(d => String(d.id)))
    Object.keys(markers.current).forEach(id => {
      if (!activeIds.has(id)) {
        leafletMap.current.removeLayer(markers.current[id])
        delete markers.current[id]
      }
    })

    // Auto-fit to all active drivers
    const bounds = data
      .filter(t => t.last_lat && t.last_lng)
      .map(t => [t.last_lat, t.last_lng])
    if (bounds.length > 0) {
      leafletMap.current.fitBounds(bounds, { padding: [40, 40] })
    }

    data.forEach(trip => {
      if (!trip.last_lat || !trip.last_lng) return
      const name = trip.drivers?.name || 'Driver'
      const truck = trip.drivers?.truck_number || ''
      const mins = Math.floor((Date.now() - new Date(trip.last_seen)) / 60000)
      const color = mins < 5 ? '#22c55e' : mins < 15 ? '#f97316' : '#ef4444'

      const icon = window.L.divIcon({
        html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚛</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const popup = `<b>${name}</b><br>Truck #${truck}<br>${trip.total_miles?.toFixed(1)} mi<br>Last seen: ${mins}m ago`

      if (markers.current[trip.id]) {
        markers.current[trip.id].setLatLng([trip.last_lat, trip.last_lng])
        markers.current[trip.id].setIcon(icon)
        markers.current[trip.id].setPopupContent(popup)
      } else {
        const marker = window.L.marker([trip.last_lat, trip.last_lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(popup)
        markers.current[trip.id] = marker
      }
    })
  }

  function focusDriver(trip) {
    setSelected(trip)
    if (leafletMap.current && trip.last_lat && trip.last_lng) {
      leafletMap.current.setView([trip.last_lat, trip.last_lng], 14)
      markers.current[trip.id]?.openPopup()
    }
  }

  function lastSeenLabel(ts) {
    if (!ts) return 'Unknown'
    const mins = Math.floor((Date.now() - new Date(ts)) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Live Fleet Map</h1>
        <button
          onClick={loadDrivers}
          disabled={refreshing}
          className="text-[#2D7A5F] text-sm font-medium disabled:opacity-40 flex items-center gap-1"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          {refreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Status bar */}
      {(!isOnline || fromCache) && (
        <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
          !isOnline ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <span>{!isOnline ? '📡 Offline' : '🕐 Cached'}</span>
          <span>{!isOnline ? '— showing last known positions' : `— last updated ${lastUpdated}`}</span>
        </div>
      )}

      {isOnline && lastUpdated && !fromCache && (
        <div className="px-4 py-1.5 bg-green-50 text-xs text-green-700 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live · Updated {lastUpdated}
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} style={{ height: '45vh', width: '100%', zIndex: 0 }} />

      {/* Driver List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-700">Active Drivers</p>
          <span className="text-sm text-gray-400">{drivers.length} on road</span>
        </div>

        {loading && (
          <p className="text-center text-gray-400 py-8 animate-pulse">Loading...</p>
        )}

        {!loading && drivers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🚛</div>
            <p className="font-medium">No drivers currently active</p>
            <p className="text-sm mt-1">Drivers appear here when they start a trip</p>
          </div>
        )}

        {drivers.map(trip => {
          const mins = trip.last_seen
            ? Math.floor((Date.now() - new Date(trip.last_seen)) / 60000)
            : 999
          const statusColor = mins < 5 ? 'bg-green-500' : mins < 15 ? 'bg-orange-500' : 'bg-red-500'
          return (
            <button
              key={trip.id}
              onClick={() => focusDriver(trip)}
              className={`w-full bg-white rounded-2xl p-4 shadow-sm text-left active:opacity-70 border-2 ${
                selected?.id === trip.id ? 'border-[#2D7A5F]' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold text-lg">
                    {trip.drivers?.name?.[0]}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{trip.drivers?.name}</p>
                  <p className="text-sm text-gray-400">
                    Truck #{trip.drivers?.truck_number} · {trip.total_miles?.toFixed(1)} mi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{lastSeenLabel(trip.last_seen)}</p>
                  {trip.last_lat && (
                    <a
                      href={`https://maps.google.com/?q=${trip.last_lat},${trip.last_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-[#2D7A5F] font-medium"
                    >
                      Maps →
                    </a>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
