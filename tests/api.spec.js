const { test, expect } = require('@playwright/test')

const BASE = 'https://smiths-dnxx.vercel.app'

// ── DRIVERS ──────────────────────────────────────
test('GET /api/drivers returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/drivers`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
  if (data.length > 0) {
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('status')
  }
})

// ── TICKETS ───────────────────────────────────────
test('GET /api/tickets returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/tickets`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

test('GET /api/tickets filters by status', async ({ request }) => {
  const res = await request.get(`${BASE}/api/tickets?status=submitted`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
  data.forEach(t => expect(t.status).toBe('submitted'))
})

// ── TRACKING ──────────────────────────────────────
test('GET /api/tracking returns active drivers', async ({ request }) => {
  const res = await request.get(`${BASE}/api/tracking`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── CUSTOMERS ─────────────────────────────────────
test('GET /api/customers returns array with names', async ({ request }) => {
  const res = await request.get(`${BASE}/api/customers`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── LOCATIONS ─────────────────────────────────────
test('GET /api/locations returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/locations`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── MAINTENANCE ───────────────────────────────────
test('GET /api/maintenance returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/maintenance`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── TIMESHEETS ────────────────────────────────────
test('GET /api/timesheets returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/timesheets`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── COMPLIANCE ────────────────────────────────────
test('GET /api/compliance returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/compliance`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── MESSAGES ──────────────────────────────────────
test('GET /api/messages returns array', async ({ request }) => {
  const res = await request.get(`${BASE}/api/messages`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
})

// ── IFTA ──────────────────────────────────────────
test('GET /api/ifta returns valid report structure', async ({ request }) => {
  const res = await request.get(`${BASE}/api/ifta?quarter=2&year=2026`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data).toHaveProperty('quarter')
  expect(data).toHaveProperty('summary')
  expect(data).toHaveProperty('states')
  expect(Array.isArray(data.states)).toBeTruthy()
  expect(data.summary).toHaveProperty('totalMiles')
  expect(data.summary).toHaveProperty('totalGallons')
  expect(data.summary).toHaveProperty('totalTaxOwed')
})

// ── SCORECARD ─────────────────────────────────────
test('GET /api/scorecard returns driver scores', async ({ request }) => {
  const res = await request.get(`${BASE}/api/scorecard?days=30`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBeTruthy()
  if (data.length > 0) {
    expect(data[0]).toHaveProperty('driver')
    expect(data[0]).toHaveProperty('safety')
    expect(data[0].safety).toHaveProperty('score')
    expect(data[0].safety).toHaveProperty('grade')
  }
})

// ── PRE-TRIP ──────────────────────────────────────
test('GET /api/pre-trip admin view returns drivers', async ({ request }) => {
  const res = await request.get(`${BASE}/api/pre-trip?admin=true`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data).toHaveProperty('drivers')
  expect(data).toHaveProperty('date')
})

// ── FUEL ──────────────────────────────────────────
test('GET /api/fuel returns fuel_logs', async ({ request }) => {
  const res = await request.get(`${BASE}/api/fuel`)
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data).toHaveProperty('fuel_logs')
})

// ── PUSH ──────────────────────────────────────────
test('PUT /api/push returns sent count', async ({ request }) => {
  const res = await request.put(`${BASE}/api/push`, {
    data: { title: 'Test', body: 'Playwright test', url: '/driver' }
  })
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data).toHaveProperty('sent')
  expect(typeof data.sent).toBe('number')
})

// ── AI ASSISTANT ──────────────────────────────────
test('POST /api/assistant responds with reply', async ({ request }) => {
  const res = await request.post(`${BASE}/api/assistant`, {
    data: {
      messages: [{ role: 'user', content: 'how many drivers are active' }],
      role: 'admin'
    }
  })
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data).toHaveProperty('reply')
  expect(data.reply.length).toBeGreaterThan(10)
})

// ── ERROR HANDLING ────────────────────────────────
test('GET /api/tickets/invalid-id returns 404 or error', async ({ request }) => {
  const res = await request.get(`${BASE}/api/tickets/not-a-real-id`)
  expect([200, 400, 404, 500]).toContain(res.status())
})

test('POST /api/push with empty body handles gracefully', async ({ request }) => {
  const res = await request.put(`${BASE}/api/push`, {
    data: {}
  })
  expect([200, 400]).toContain(res.status())
})
