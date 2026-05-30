const CACHE = 'smiths-v1'

self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })

let watchId = null
let tripId = null
let driverId = null
let apiBase = null

self.addEventListener('message', async (event) => {
  const { type, data } = event.data
  if (type === 'START_TRACKING') {
    tripId = data.tripId
    driverId = data.driverId
    apiBase = data.apiBase
  }
  if (type === 'STOP_TRACKING') {
    tripId = null
    driverId = null
  }
})

self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'gps-update') {
    event.waitUntil(sendPing())
  }
})

async function sendPing() {
  if (!tripId || !driverId || !apiBase) return
  try {
    const clients_list = await clients.matchAll()
    clients_list.forEach(client => {
      client.postMessage({ type: 'REQUEST_LOCATION' })
    })
  } catch (e) {}
}
