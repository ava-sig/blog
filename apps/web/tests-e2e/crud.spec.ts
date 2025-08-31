import { test, expect, type Page } from '@playwright/test'
import crypto from 'node:crypto'

const API_BASE = process.env.API_BASE || process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3388'
const JWT_SECRET = process.env.JWT_SECRET || ''

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signJwtHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 10 // 10 minutes
  const full = { iat, exp, ...payload }
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(full))}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest()
  return `${data}.${base64url(sig)}`
}

const ADMIN_TOKEN = JWT_SECRET ? signJwtHS256({ role: 'admin', user: 'admin' }, JWT_SECRET) : ''

// Helper to prime auth before any page scripts run
async function primeAuth(page: Page) {
  await page.addInitScript((token: string) => {
    try {
      window.localStorage.setItem('token', token)
      window.sessionStorage.setItem('auth.session', '1')
    } catch {}
  }, ADMIN_TOKEN)
}

test('create, edit, delete post reflected in UI', async ({ page, request }) => {
  if (!JWT_SECRET) {
    test.skip(true, 'JWT_SECRET env var is required to run E2E write tests against Docker API')
  }
  await primeAuth(page)

  // Go to homepage
  await page.goto('/')
  // Ensure hydration completed and Pinia store initialized with token
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
  const title = `E2E Post ${Date.now()}`
  const content = `Hello from E2E at ${new Date().toISOString()}`
  // Create via API
  const created = await request.post(`${API_BASE}/api/posts`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
    data: { title, content, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'draft' },
  })
  expect(created.ok()).toBeTruthy()

  // New post should appear at top of list
  const firstCardTitle = page.locator('ul > li:first-child h4')
  await page.reload()
  await expect(firstCardTitle).toContainText(title)

  // Update via API and verify UI updates after reload
  const list = await request.get(`${API_BASE}/api/posts`)
  const items = await list.json()
  const id = items.find((p: any) => p.title === title)?.id
  expect(id).toBeTruthy()

  const newTitle = `${title} Updated`
  const newContent = `${content}\nUpdated.`
  const updated = await request.put(`${API_BASE}/api/posts/${id}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
    data: { title: newTitle, content: newContent, slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
  })
  expect(updated.ok()).toBeTruthy()
  await page.reload()
  await expect(firstCardTitle).toContainText(newTitle)

  // Delete via API and verify removal in UI
  const del = await request.delete(`${API_BASE}/api/posts/${id}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  expect(del.ok()).toBeTruthy()
  await page.reload()
  await expect(firstCardTitle).not.toContainText(newTitle)
})
