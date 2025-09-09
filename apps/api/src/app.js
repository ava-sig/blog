const express = require('express')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const multer = require('multer')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())
// Very permissive CORS for dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// serve uploads statically
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads')
app.use('/uploads', express.static(uploadsDir))

// Simple file-backed storage
const dataDir = path.join(__dirname, '..', 'data')
const postsFile = path.join(dataDir, 'posts.json')

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(postsFile)) fs.writeFileSync(postsFile, '[]')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
}

function readPosts() {
  ensureStore()
  try { return JSON.parse(fs.readFileSync(postsFile, 'utf8')) } catch { return [] }
}

function writePosts(posts) {
  ensureStore()
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2))
}

// Simple slugify mirroring frontend behavior: prefer lowercase, dashes, trim
function slugify(input) {
  if (!input || typeof input !== 'string') return ''
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Posts CRUD
app.get('/api/posts', (req, res) => {
  res.json(readPosts())
})

app.get('/api/posts/:id', (req, res) => {
  const posts = readPosts()
  const reqId = String(req.params.id)
  const p = posts.find(x => String(x.id) === reqId)
  if (!p) {
    // eslint-disable-next-line no-console
    console.log('[api] GET /api/posts/:id not_found', { id: reqId, have: posts.map(x => String(x.id)) })
    return res.status(404).json({ error: 'Not found' })
  }
  res.json(p)
})

// Simple Bearer token auth for write routes
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || ''
  const m = /^Bearer\s+(.+)$/i.exec(header)
  const token = m?.[1] || ''
  const staticToken = process.env.API_TOKEN || ''
  const jwtSecret = process.env.JWT_SECRET || ''

  // Allow explicit insecure writes in dev only when neither JWT nor static token is configured
  if (!jwtSecret && !staticToken) {
    if (process.env.ALLOW_INSECURE_WRITES === '1') return next()
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_request", error_description="authentication required"')
    return res.status(401).json({ error: 'auth_required' })
  }

  // Prefer JWT verification when secret is configured
  if (jwtSecret) {
    // Missing token
    if (!token) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_request", error_description="missing bearer token"')
      return res.status(401).json({ error: 'token_missing' })
    }
    try {
      const payload = jwt.verify(token, jwtSecret)
      // Optional authorization policy: require admin-like claims
      // Accept if role=admin, admin=true, user=admin, or scope/scopes contains 'admin'
      const scopeStr = typeof payload?.scope === 'string' ? payload.scope : ''
      const scopes = Array.isArray(payload?.scopes) ? payload.scopes : scopeStr.split(/[ ,]/).filter(Boolean)
      const isAdmin = (
        payload?.role === 'admin' ||
        payload?.admin === true ||
        payload?.user === 'admin' ||
        (Array.isArray(scopes) && scopes.includes('admin'))
      )
      if (!isAdmin) {
        res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="insufficient_scope", error_description="admin scope required"')
        return res.status(403).json({ error: 'insufficient_scope' })
      }
      return next()
    } catch (err) {
      // If JWT verification fails and a static token is configured, fall back to static match
      if (staticToken && token === staticToken) return next()
      const isExpired = err && (err.name === 'TokenExpiredError' || /expired/i.test(String(err.message || '')))
      const hdr = isExpired
        ? 'Bearer realm="api", error="invalid_token", error_description="token expired"'
        : 'Bearer realm="api", error="invalid_token", error_description="token invalid"'
      res.setHeader('WWW-Authenticate', hdr)
      return res.status(401).json({ error: isExpired ? 'token_expired' : 'token_invalid' })
    }
  }

  // Fallback: static token equality
  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_request", error_description="missing bearer token"')
    return res.status(401).json({ error: 'token_missing' })
  }
  if (staticToken && token === staticToken) return next()
  res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="token invalid"')
  return res.status(401).json({ error: 'token_invalid' })
}

app.post('/api/posts', requireAuth, (req, res) => {
  const posts = readPosts()
  const { title, content, slug, status } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const post = {
    id,
    title,
    content: content || '',
    slug: slug || slugify(title),
    status: status || 'draft',
    createdAt,
    updatedAt: createdAt,
  }
  posts.unshift(post)
  writePosts(posts)
  res.status(201).json(post)
})

app.put('/api/posts/:id', requireAuth, (req, res) => {
  const posts = readPosts()
  const i = posts.findIndex(x => String(x.id) === String(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  const { title, content, slug, status } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const updated = {
    ...posts[i],
    title,
    content: content ?? posts[i].content,
    slug: typeof slug === 'string' ? (slug || slugify(title)) : (posts[i].slug || slugify(title)),
    status: typeof status === 'string' ? status : (posts[i].status || 'draft'),
    updatedAt: new Date().toISOString(),
  }
  posts[i] = updated
  writePosts(posts)
  res.json(updated)
})

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const posts = readPosts()
  const idx = posts.findIndex(x => String(x.id) === String(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const [removed] = posts.splice(idx, 1)
  writePosts(posts)
  res.json({ ok: true, id: removed.id })
})

// File uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    const name = randomUUID() + ext
    cb(null, name)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB

app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' })
  const url = `/uploads/${req.file.filename}`
  res.json({ ok: true, url })
})

module.exports = { app, initDb: async () => {} }
