const CACHE = 'tss-v3'
const OFFLINE_URLS = ['/', '/login', '/driver', '/admin']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS).catch(() => {}))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })))
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'TruckSuperSoftware', body: 'New notification' }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data.url))
})
