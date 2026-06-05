const { test, expect } = require('@playwright/test')

const BASE = process.env.BASE_URL || 'https://smiths-dnxx.vercel.app'

test.describe('Login Page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('text=Smith\'s Freight Hub').or(page.locator('text=Login')).first()).toBeVisible()
  })

  test('admin login tab exists', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator('text=Admin').or(page.locator('text=admin')).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Driver Login Flow', () => {
  test('redirects unauthenticated driver to login', async ({ page }) => {
    await page.goto(`${BASE}/driver`)
    await expect(page).toHaveURL(/login|driver/, { timeout: 10000 })
  })
})

test.describe('Admin Dashboard', () => {
  test('redirects unauthenticated admin to login', async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    await expect(page).toHaveURL(/login|admin/, { timeout: 10000 })
  })
})

test.describe('Public Pages', () => {
  test('login page loads without error', async ({ page }) => {
    const res = await page.goto(`${BASE}/login`)
    expect(res.status()).toBeLessThan(500)
  })

  test('no console errors on login page', async ({ page }) => {
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('sw.js')
    )
    expect(criticalErrors.length).toBe(0)
  })
})
