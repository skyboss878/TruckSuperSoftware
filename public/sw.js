const VERSION_URL = '/version.json'
let currentVersion = null

// On install - take control immediately
self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

// Network first — always try network, fall back to cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Skip non-GET and non-same-origin
  if (e.request.method !== 'GET') return
  if (!url.origin.includes(self.location.hostname) && !url.hostname.includes('vercel.app')) return

  // Static assets — cache first (they have content hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open('static-v1').then(cache => cache.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // API routes — network only, never cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request))
    return
  }

  // Pages — network first, short cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open('pages-v1').then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// Listen for version check messages
self.addEventListener('message', e => {
  if (e.data === 'CHECK_VERSION') {
    fetch(VERSION_URL + '?t=' + Date.now())
      .then(r => r.json())
      .then(data => {
        if (currentVersion && currentVersion !== data.version) {
          // New deploy — clear all caches and reload all clients
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
          self.clients.matchAll().then(clients =>
            clients.forEach(client => client.postMessage('RELOAD'))
          )
        }
        currentVersion = data.version
      })
      .catch(() => {})
  }
})
