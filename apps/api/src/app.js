const express = require('express')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const multer = require('multer')

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

app.post('/api/posts', (req, res) => {
  const posts = readPosts()
  const { title, content } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const post = { id, title, content: content || '', createdAt, updatedAt: createdAt }
  posts.unshift(post)
  writePosts(posts)
  res.status(201).json(post)
})

app.put('/api/posts/:id', (req, res) => {
  const posts = readPosts()
  const i = posts.findIndex(x => String(x.id) === String(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  const { title, content } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title required' })
  const updated = { ...posts[i], title, content: content ?? posts[i].content, updatedAt: new Date().toISOString() }
  posts[i] = updated
  writePosts(posts)
  res.json(updated)
})

app.delete('/api/posts/:id', (req, res) => {
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

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' })
  const url = `/uploads/${req.file.filename}`
  res.json({ ok: true, url })
})

module.exports = { app, initDb: async () => {} }
