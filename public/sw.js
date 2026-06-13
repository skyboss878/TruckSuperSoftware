// Self-destructing service worker - immediately unregisters on activation
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  await self.registration.unregister()
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => client.navigate(client.url))
})
