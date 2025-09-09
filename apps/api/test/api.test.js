// Basic API tests using Node 20 built-in test runner and fetch (CommonJS)
const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

// Ensure clean data store before tests
const dataDir = path.join(process.cwd(), 'apps', 'api', 'data')
const postsFile = path.join(dataDir, 'posts.json')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

test('CRUD lifecycle reflects in list', async () => {
  // Create
  const created = await json('POST', '/api/posts', { title: 'ListCheck', content: 'Body' }, 'test-token')
  assert.equal(created.status, 201)
  const id = created.data.id

  // List should include
  let res = await fetch(baseURL + '/api/posts')
  assert.equal(res.status, 200)
  let arr = await res.json()
  assert.ok(arr.some(p => p.id === id))

  // Delete
  const del = await fetch(baseURL + '/api/posts/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
  assert.equal(del.status, 200)

  // List should exclude
  res = await fetch(baseURL + '/api/posts')
  assert.equal(res.status, 200)
  arr = await res.json()
  assert.ok(!arr.some(p => p.id === id))
})

// JWT authorization scenarios

test('JWT with admin claim passes', async () => {
  const jwt = require('jsonwebtoken')
  process.env.JWT_SECRET = 'test-secret'
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET)
  const { status } = await json('POST', '/api/posts', { title: 'JWT ok', content: '' }, token)
  assert.equal(status, 201)
})

test('JWT without admin claim is rejected (401)', async () => {
  const jwt = require('jsonwebtoken')
  process.env.JWT_SECRET = 'test-secret'
  const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET)
  const { status, data } = await json('POST', '/api/posts', { title: 'JWT bad', content: '' }, token)
  assert.equal(status, 403)
  assert.equal(data.error, 'insufficient_scope')
})

test('When JWT verify fails but static token matches, allow via fallback', async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.API_TOKEN = 'test-token' // already set, ensure value
  // Send the static token as the bearer string; JWT verify will fail and middleware should fallback to static match
  const { status } = await json('POST', '/api/posts', { title: 'fallback ok', content: '' }, 'test-token')
  assert.equal(status, 201)
})

test('Explicit insecure writes allowed only when enabled', async () => {
  // Disable both auth methods
  process.env.JWT_SECRET = ''
  process.env.API_TOKEN = ''
  // Without flag -> 401
  delete process.env.ALLOW_INSECURE_WRITES
  let res = await json('POST', '/api/posts', { title: 'nope', content: '' })
  assert.equal(res.status, 401)
  // With flag -> 201
  process.env.ALLOW_INSECURE_WRITES = '1'
  res = await json('POST', '/api/posts', { title: 'ok', content: '' })
  assert.equal(res.status, 201)
  // cleanup: restore default
  delete process.env.ALLOW_INSECURE_WRITES
  process.env.API_TOKEN = 'test-token'
})
fs.writeFileSync(postsFile, '[]')

// Configure default static token for write routes
process.env.API_TOKEN = 'test-token'

// Import app after setting env so middleware reads it
const { app } = require('../src/app.js')

let server
let baseURL

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, '127.0.0.1', () => {
      const address = server.address()
      baseURL = `http://127.0.0.1:${address.port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve) => server.close(() => resolve()))
})

async function json(method, path, body, token) {
  const res = await fetch(baseURL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

// Health

test('health returns ok', async () => {
  const res = await fetch(baseURL + '/api/health')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
})

// Authz probe

test('GET /api/authz with admin claim -> 200', async () => {
  const jwt = require('jsonwebtoken')
  process.env.JWT_SECRET = 'test-secret'
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET)
  const res = await fetch(baseURL + '/api/authz', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
})

test('GET /api/authz without admin claim -> 403 insufficient_scope', async () => {
  const jwt = require('jsonwebtoken')
  process.env.JWT_SECRET = 'test-secret'
  const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET)
  const res = await fetch(baseURL + '/api/authz', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 403)
  const body = await res.json()
  assert.equal(body.error, 'insufficient_scope')
})

test('GET /api/authz without token -> 401 token_missing', async () => {
  const res = await fetch(baseURL + '/api/authz')
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.error, 'token_missing')
})

// Read list

test('GET /api/posts returns array', async () => {
  const res = await fetch(baseURL + '/api/posts')
  assert.equal(res.status, 200)
  const arr = await res.json()
  assert.ok(Array.isArray(arr))
})

// Unauthorized write

test('POST /api/posts without token -> 401 token_missing', async () => {
  const { status, data } = await json('POST', '/api/posts', { title: 't', content: 'c' })
  assert.equal(status, 401)
  assert.equal(data.error, 'token_missing')
})

// Upload auth

test('POST /api/upload without token -> 401 token_missing', async () => {
  const form = new FormData()
  const blob = new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' })
  form.set('image', blob, 'tiny.png')
  const res = await fetch(baseURL + '/api/upload', { method: 'POST', body: form })
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.error, 'token_missing')
})

test('POST /api/upload with token -> 200 and url', async () => {
  const form = new FormData()
  const blob = new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' })
  form.set('image', blob, 'tiny.png')
  const res = await fetch(baseURL + '/api/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: form,
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
  assert.match(body.url, /^\/uploads\//)
})

// Authorized CRUD

test('CRUD with token', async () => {
  // Create
  const created = await json('POST', '/api/posts', { title: 'Hello', content: 'World' }, 'test-token')
  assert.equal(created.status, 201)
  assert.ok(created.data.id)
  assert.equal(created.data.slug, 'hello')
  assert.equal(created.data.status, 'draft')

  const id = created.data.id

  // Get one
  const one = await fetch(baseURL + '/api/posts/' + id)
  assert.equal(one.status, 200)
  const oneBody = await one.json()
  assert.equal(oneBody.title, 'Hello')

  // Update
  const updated = await json('PUT', '/api/posts/' + id, { title: 'Hello2', content: 'World2', slug: 'hello2', status: 'published' }, 'test-token')
  assert.equal(updated.status, 200)
  assert.equal(updated.data.title, 'Hello2')
  assert.equal(updated.data.slug, 'hello2')
  assert.equal(updated.data.status, 'published')

  // Delete
  const del = await fetch(baseURL + '/api/posts/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
  assert.equal(del.status, 200)
  const delBody = await del.json()
  assert.equal(delBody.ok, true)
})
