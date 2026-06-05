#!/usr/bin/env node
// Node.js API test runner — works on Android/Termux

const BASE = 'https://smiths-dnxx.vercel.app'
let pass = 0, fail = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    pass++
  } catch(e) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${e.message}`)
    fail++
  }
}

function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Expected ${exp}, got ${val}`) },
    toEqual: (exp) => { if (JSON.stringify(val) !== JSON.stringify(exp)) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`) },
    toBeTruthy: () => { if (!val) throw new Error(`Expected truthy, got ${val}`) },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`) },
    toHaveProperty: (key) => { if (!(key in Object(val))) throw new Error(`Missing property: ${key}`) },
    toContain: (item) => { if (!val?.includes?.(item)) throw new Error(`Expected to contain ${item}`) },
  }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, data: await res.json() }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

;(async () => {
  console.log('\n══════════════════════════════════════')
  console.log('  Smith\'s Freight Hub — Node.js Tests')
  console.log('══════════════════════════════════════\n')

  console.log('── DRIVERS ──────────────────────────')
  await test('GET /api/drivers returns array', async () => {
    const { status, data } = await get('/api/drivers')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('name')
      expect(data[0]).toHaveProperty('id')
    }
  })

  await test('Active drivers have status field', async () => {
    const { data } = await get('/api/drivers?status=active')
    expect(Array.isArray(data)).toBeTruthy()
    data.forEach(d => expect(d.status).toBe('active'))
  })

  console.log('\n── TICKETS ──────────────────────────')
  await test('GET /api/tickets returns array', async () => {
    const { status, data } = await get('/api/tickets')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  await test('Ticket filter by status=submitted', async () => {
    const { data } = await get('/api/tickets?status=submitted')
    expect(Array.isArray(data)).toBeTruthy()
    data.forEach(t => expect(t.status).toBe('submitted'))
  })

  await test('Ticket filter by status=approved', async () => {
    const { data } = await get('/api/tickets?status=approved')
    expect(Array.isArray(data)).toBeTruthy()
    data.forEach(t => expect(t.status).toBe('approved'))
  })

  console.log('\n── TRACKING ─────────────────────────')
  await test('GET /api/tracking returns array', async () => {
    const { status, data } = await get('/api/tracking')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── CUSTOMERS ────────────────────────')
  await test('GET /api/customers returns array', async () => {
    const { status, data } = await get('/api/customers')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── LOCATIONS ────────────────────────')
  await test('GET /api/locations returns array', async () => {
    const { status, data } = await get('/api/locations')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── MAINTENANCE ──────────────────────')
  await test('GET /api/maintenance returns array', async () => {
    const { status, data } = await get('/api/maintenance')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── TIMESHEETS ───────────────────────')
  await test('GET /api/timesheets returns array', async () => {
    const { status, data } = await get('/api/timesheets')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── COMPLIANCE ───────────────────────')
  await test('GET /api/compliance returns array', async () => {
    const { status, data } = await get('/api/compliance')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── MESSAGES ─────────────────────────')
  await test('GET /api/messages returns array', async () => {
    const { status, data } = await get('/api/messages')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  console.log('\n── IFTA ─────────────────────────────')
  await test('GET /api/ifta returns valid structure', async () => {
    const { status, data } = await get('/api/ifta?quarter=2&year=2026')
    expect(status).toBe(200)
    expect(data).toHaveProperty('quarter')
    expect(data).toHaveProperty('summary')
    expect(data).toHaveProperty('states')
    expect(Array.isArray(data.states)).toBeTruthy()
  })

  await test('IFTA summary has all required fields', async () => {
    const { data } = await get('/api/ifta?quarter=2&year=2026')
    expect(data.summary).toHaveProperty('totalMiles')
    expect(data.summary).toHaveProperty('totalGallons')
    expect(data.summary).toHaveProperty('totalTaxOwed')
    expect(data.summary).toHaveProperty('avgMPG')
  })

  console.log('\n── SCORECARD ────────────────────────')
  await test('GET /api/scorecard returns array', async () => {
    const { status, data } = await get('/api/scorecard?days=30')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBeTruthy()
  })

  await test('Scorecard has safety + grade fields', async () => {
    const { data } = await get('/api/scorecard?days=30')
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('driver')
      expect(data[0]).toHaveProperty('safety')
      expect(data[0].safety).toHaveProperty('score')
      expect(data[0].safety).toHaveProperty('grade')
    }
  })

  console.log('\n── PRE-TRIP ─────────────────────────')
  await test('GET /api/pre-trip admin view', async () => {
    const { status, data } = await get('/api/pre-trip?admin=true')
    expect(status).toBe(200)
    expect(data).toHaveProperty('drivers')
    expect(data).toHaveProperty('date')
  })

  console.log('\n── FUEL ─────────────────────────────')
  await test('GET /api/fuel returns fuel_logs', async () => {
    const { status, data } = await get('/api/fuel')
    expect(status).toBe(200)
    expect(data).toHaveProperty('fuel_logs')
  })

  console.log('\n── PUSH ─────────────────────────────')
  await test('PUT /api/push returns sent count', async () => {
    const { status, data } = await put('/api/push', {
      title: 'Test', body: 'Node test', url: '/driver'
    })
    expect(status).toBe(200)
    expect(data).toHaveProperty('sent')
  })

  console.log('\n── AI ASSISTANT ─────────────────────')
  await test('POST /api/assistant returns reply', async () => {
    const { status, data } = await post('/api/assistant', {
      messages: [{ role: 'user', content: 'how many active drivers' }],
      role: 'admin'
    })
    expect(status).toBe(200)
    expect(data).toHaveProperty('reply')
    expect(data.reply.length).toBeGreaterThan(5)
  })

  console.log('\n── ERROR HANDLING ───────────────────')
  await test('Invalid ticket ID returns non-500', async () => {
    const { status } = await get('/api/tickets/not-a-real-id')
    expect([200,400,404].includes(status)).toBeTruthy()
  })

  await test('Missing driver_id on pre-trip returns 400', async () => {
    const { status } = await get('/api/pre-trip')
    expect(status).toBe(400)
  })

  console.log('\n══════════════════════════════════════')
  console.log(`  Results: ${pass} passed · ${fail} failed`)
  console.log('══════════════════════════════════════\n')
  process.exit(fail > 0 ? 1 : 0)
})()
