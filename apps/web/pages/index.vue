<template>
  <main class="container-page py-8">
    <h2 class="text-xl font-semibold tracking-tight text-base-text mb-4">Posts</h2>

    <section v-if="auth.editing" class="panel-muted p-4 mt-4">
      <h3 class="text-base font-medium mb-3">New Post</h3>
      <form @submit.prevent="create()" class="grid gap-3">
        <label class="block">
          <span class="block text-xs text-base-sub mb-1">Title</span>
          <input
            class="input new-title-input"
            v-model="title"
            placeholder="Title"
            required
            @keydown="onComposerKeydown"
          />
        </label>
        <label class="block">
          <span class="block text-xs text-base-sub mb-1">Content</span>
          <textarea
            class="input new-content-input"
            v-model="content"
            placeholder="Content"
            rows="6"
            @keydown="onComposerKeydown"
            @paste.stop="onPaste($event as any)"
          />
        </label>
        <div v-if="uploading" class="uploading inline-flex items-center gap-2 text-xs text-base-sub -mt-1">
          <span class="spinner" /> Uploading image…
        </div>
        <div class="flex justify-end">
          <button class="btn-primary focus-ring" type="submit">Create</button>
        </div>
      </form>
    </section>

    <section class="mt-6">
      <div v-if="route.query.missing === '1'" class="border border-rose-900/60 bg-rose-900/20 text-rose-300 rounded-md px-3 py-2 mb-3">
        The post you tried to edit was not found.
      </div>
      <div v-if="loading" class="text-base-sub">Loading...</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <template v-else>
        <div v-if="posts.length === 0" class="panel p-6 text-center">
          <div class="text-base-sub mb-2">No posts yet</div>
          <div class="text-sm text-zinc-400">Use edit mode to create your first post. Paste an image to attach quickly.</div>
        </div>
        <ul v-else class="list-none p-0 grid gap-3">
          <li
            v-for="p in posts"
            :key="p.id"
            class="panel card card-art reveal p-4 cursor-default hover-lift hover-ring focus-ring"
            tabindex="0"
            @click="onCardClick(p, $event)"
            @paste.stop="editingId === p.id ? onPaste($event as any) : null"
            @mousemove="onCardParallax"
            @mouseleave="onCardParallaxLeave"
          >
            <NuxtLink
              v-if="!auth.editing"
              :to="`/p/${canonicalSlug(p)}`"
              class="card-link-overlay"
              aria-hidden="true"
              tabindex="-1"
              @click.stop
            />
            <div class="timeline" aria-hidden="true"></div>
            <button v-if="auth.editing" class="card-close focus-ring" @click.stop="remove(p.id)" aria-label="Delete post" title="Delete">×</button>
            <a
              class="card-xshare focus-ring"
              :href="xShareUrl(p)"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on X"
              title="Share on X"
              @click.stop
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.27l-5.38-7.04-6.15 7.04H1.43l7.73-8.84L1 2.25h7.03l4.86 6.5 5.354-6.5zm-1.16 18.24h1.832L7.01 4.13H5.06l12.025 16.36z"/>
              </svg>
            </a>

            <template v-if="editingId === p.id">
              <input
                v-model="editTitle"
                class="title-input input !text-base !font-medium !mb-2"
                placeholder="Title"
                @blur="onEditBlur"
                @keydown.enter.prevent="saveEdit"
                @keydown="onComposerKeydown"
                @click.stop
                autofocus
              />
              <textarea
                v-model="editContent"
                class="content-input input !min-h-[180px]"
                rows="6"
                placeholder="Content"
                @blur="onEditBlur"
                @keydown="onComposerKeydown"
                @click.stop
              />
              <div v-if="uploading" class="uploading inline-flex items-center gap-2 text-xs text-base-sub mt-2">
                <span class="spinner" /> Uploading image…
              </div>
            </template>
            <template v-else>
              <h4 class="m-0 mb-2 text-[21px] font-semibold leading-tight tracking-tight">
                <NuxtLink
                  :to="`/p/${canonicalSlug(p)}`"
                  class="no-underline text-base-text hover:text-indigo-300 focus-ring"
                  @click.stop
                >
                  {{ p.title }}
                </NuxtLink>
              </h4>
              <div class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle" v-html="renderContent(p.content)"></div>
            </template>

          <div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60">Updated: {{ formatTs(p.updatedAt || p.createdAt) }}</div>
        </li>
      </ul>
      </template>
    </section>
  </main>
  <UiToast :visible="toastVisible" :type="toastType" :message="toastMsg" />
  
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const api = useApi()
const runtime = useRuntimeConfig()
const apiBase = ((runtime.public as any)?.apiBase || '').replace(/\/$/, '')

const posts = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const title = ref('')
const content = ref('')
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editContent = ref('')
let blurTimer: any = null
const uploading = ref(false)
const toastVisible = ref(false)
const toastMsg = ref('')
const toastType = ref<'success' | 'error'>('success')
let lastInsertUrl = ''
let lastInsertAt = 0

let observer: IntersectionObserver | null = null

function setupReveal() {
  if (typeof window === 'undefined') return
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in')
        observer?.unobserve(en.target)
      }
    }
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 })
  document.querySelectorAll('li.reveal').forEach(el => observer!.observe(el))
}

function formatTs(input: string) {
  try {
    const d = new Date(input)
    if (isNaN(d.getTime())) return input
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(d)
  } catch {
    return input
  }
}

async function fetchPosts() {
  loading.value = true
  error.value = ''
  try {
    posts.value = await api.get('/posts')
  } catch (e: any) {
    error.value = e?.message || 'Failed to load posts'
  } finally {
    loading.value = false
  }
  await nextTick()
  setupReveal()
}

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  toastVisible.value = true
  window.clearTimeout((showToast as any)._t)
  ;(showToast as any)._t = window.setTimeout(() => (toastVisible.value = false), 1600)
}

function slugify(t: string) {
  return (t || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function create() {
  try {
    const payload = {
      title: title.value,
      content: content.value,
      slug: slugify(title.value),
      status: 'draft',
    }
    const created = await api.post('/posts', payload)
    posts.value.unshift(created)
    title.value = ''
    content.value = ''
    await nextTick()
    setupReveal()
  } catch (e: any) {
    error.value = e?.message || 'Failed to create post'
  }
}

async function remove(id: string) {
  try {
    await api.del(`/posts/${id}`)
    posts.value = posts.value.filter(p => p.id !== id)
    showToast('Deleted', 'success')
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete post'
    showToast('Delete failed', 'error')
  }
}

function gotoEdit(id: string) {
  router.push(`/posts/${id}`)
}

function startEdit(p: any) {
  if (!auth.editing) return
  if (editingId.value === p.id) return
  editingId.value = p.id
  editTitle.value = p.title
  editContent.value = p.content
}

function onCardClick(p: any, e: MouseEvent) {
  if (!auth.editing) return
  // If already editing this card, ignore clicks inside the card
  if (editingId.value === p.id) return
  startEdit(p)
}

async function saveEdit() {
  if (!editingId.value) return
  try {
    const id = editingId.value
    const payload = {
      title: editTitle.value,
      content: editContent.value,
      slug: slugify(editTitle.value),
      status: 'draft',
    }
    const updated = await api.put(`/posts/${id}`, payload)
    const i = posts.value.findIndex(x => x.id === id)
    if (i !== -1) posts.value[i] = updated
    showToast('Saved', 'success')
  } catch (e: any) {
    error.value = e?.message || 'Failed to save post'
    showToast('Save failed', 'error')
  } finally {
    editingId.value = null
  }
}

function onEditBlur() {
  clearTimeout(blurTimer)
  // small delay so moving focus between inputs doesn't trigger save prematurely
  blurTimer = setTimeout(() => {
    // If neither input has focus, save
    const active = document.activeElement as HTMLElement | null
    const isTitle = active?.classList?.contains('title-input')
    const isContent = active?.classList?.contains('content-input')
    if (!isTitle && !isContent) {
      saveEdit()
    }
  }, 120)
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderContent(text: string) {
  if (!text) return ''
  // Replace markdown image syntax ![alt](url) or ![alt](url "title") with img tags
  const escaped = escapeHtml(text)
  // Regex captures the URL only (no title), ignoring trailing title or spaces
  const withImages = escaped.replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, url) => {
    let u = String(url).trim()
    // Remove surrounding quotes or angle brackets if any, and stray closing parens
    u = u.replace(/^<|>$/g, '')
    u = u.replace(/^"+|"+$/g, '')
    u = u.replace(/[)]+$/g, '')
    if (u.startsWith('/uploads/')) u = `${apiBase}${u}`
    return `<img src="${u}" alt="" />\n`
  })
  // Convert Markdown links [text](url) to anchors
  const withLinks = withImages.replace(/\[([^\]]+)\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, text, url) => {
    let u = String(url).trim()
    u = u.replace(/^<|>$/g, '')
    u = u.replace(/^"+|"+$/g, '')
    u = u.replace(/[)]+$/g, '')
    const t = String(text)
    const safeText = t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<a href="${u}" target="_blank" rel="noopener noreferrer">${safeText}</a>`
  })
  return withLinks
}

function firstImageUrlFromMarkdown(text: string): string | null {
  if (!text) return null
  const m = /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+\"[^\"]*\")?\s*\)/.exec(text)
  if (!m) return null
  let u = String(m[1]).trim()
  u = u.replace(/^<|>$/g, '').replace(/^"+|"+$/g, '').replace(/[)]+$/g, '')
  if (u.startsWith('/uploads/')) u = `${apiBase}${u}`
  return u
}

function titleToSlug(input: string): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function canonicalSlug(p: any): string {
  const t = titleToSlug(p?.title || '')
  return t || p?.slug || p?.id || ''
}

function postUrl(p: any): string {
  const slug = canonicalSlug(p)
  if (!slug) return ''
  if (typeof window !== 'undefined') return `${location.origin}/p/${slug}`
  return `/p/${slug}`
}

function xShareUrl(p: any): string {
  const text = encodeURIComponent(p.title || '')
  const url = encodeURIComponent(postUrl(p))
  return `https://x.com/intent/tweet?text=${text}&url=${url}`
}

function onCardParallax(e: MouseEvent) {
  const t = e.currentTarget as HTMLElement | null
  if (!t) return
  const rect = t.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = (e.clientX - cx) / rect.width
  const dy = (e.clientY - cy) / rect.height
  const max = 10 // px movement for gradients
  t.style.setProperty('--px', `${dx * max}px`)
  t.style.setProperty('--py', `${dy * max}px`)
}

function onCardParallaxLeave(e: MouseEvent) {
  const t = e.currentTarget as HTMLElement | null
  if (!t) return
  t.style.setProperty('--px', '0px')
  t.style.setProperty('--py', '0px')
}

async function onPaste(e: ClipboardEvent) {
  if (!auth.editing) return
  if (uploading.value) return
  const items = e.clipboardData?.items
  const files = e.clipboardData?.files
  let file: File | null = null
  if (items && items.length > 0) {
    const it = Array.from(items).find(i => (i.kind === 'file' || i.type.startsWith('image/')))
    file = it?.getAsFile() || null
  }
  if (!file && files && files.length > 0) {
    const f = Array.from(files).find(f => f.type.startsWith('image/'))
    file = f || null
  }
  if (!file) {
    // Fallback: some tools put image only in async clipboard API
    try {
      if (typeof navigator !== 'undefined' && 'clipboard' in navigator && 'read' in navigator.clipboard) {
        const items = await (navigator.clipboard as any).read()
        for (const item of items) {
          const type = (item.types || []).find((t: string) => t.startsWith('image/'))
          if (type) {
            const blob = await item.getType(type)
            file = new File([blob], 'clipboard-image', { type: blob.type || type })
            break
          }
        }
      }
    } catch {}
  }
  if (!file) return // allow normal paste
  // Validate MIME type and magic header to ensure it's an image
  const mimeOk = file.type && file.type.startsWith('image/')
  const header = await file.slice(0, 12).arrayBuffer().then(buf => new Uint8Array(buf)).catch(() => new Uint8Array())
  const sig = Array.from(header.slice(0, 12))
  const isPng = sig.length >= 8 && sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47
  const isJpg = sig.length >= 3 && sig[0] === 0xFF && sig[1] === 0xD8 && sig[2] === 0xFF
  const isGif = sig.length >= 3 && sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46
  const isWebp = sig.length >= 12 && sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 && sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50
  const isBmp = sig.length >= 2 && sig[0] === 0x42 && sig[1] === 0x4D
  const headerOk = isPng || isJpg || isGif || isWebp || isBmp
  if (!(mimeOk || headerOk)) {
    showToast('Pasted content is not an image', 'error')
    return // allow normal paste
  }
  // Now we know it's an image; intercept paste
  e.preventDefault()
  try {
    uploading.value = true
    const { url } = await api.upload('/api/upload', 'image', file)
    const finalUrl = url.startsWith('/uploads/') ? `${apiBase}${url}` : url
    // Guard against accidental double insert (e.g., duplicate paste events)
    const now = Date.now()
    if (finalUrl === lastInsertUrl && now - lastInsertAt < 1200) {
      uploading.value = false
      return
    }
    lastInsertUrl = finalUrl
    lastInsertAt = now
    // Insert markdown at current caret position in the textarea
    const el = document.activeElement as HTMLTextAreaElement | null
    const md = `\n![image](${finalUrl})\n`
    if (el && el.classList.contains('content-input')) {
      const start = el.selectionStart ?? editContent.value.length
      const end = el.selectionEnd ?? editContent.value.length
      editContent.value = editContent.value.slice(0, start) + md + editContent.value.slice(end)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + md.length })
    } else if (el && el.classList.contains('new-content-input')) {
      const start = el.selectionStart ?? content.value.length
      const end = el.selectionEnd ?? content.value.length
      content.value = content.value.slice(0, start) + md + content.value.slice(end)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + md.length })
    } else {
      // Fallback to append to edit or new content if focused element not detectable
      if (editingId.value) editContent.value += md
      else content.value += md
    }
  } catch (err: any) {
    error.value = err?.message || 'Upload failed'
    showToast('Upload failed', 'error')
  } finally {
    uploading.value = false
  }
}

function onComposerKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const isTextarea = target instanceof HTMLTextAreaElement
  // Ctrl/Cmd+K for link insertion in textareas
  if (isTextarea && (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    const el = target as HTMLTextAreaElement
    const isEdit = el.classList.contains('content-input')
    const isNew = el.classList.contains('new-content-input')
    if (!isEdit && !isNew) return
    const model = isEdit ? editContent : content
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? start
    const selected = model.value.slice(start, end) || 'link text'
    const url = window.prompt('Enter URL to link to:', 'https://') || ''
    if (!url) return
    const md = `[${selected}](${url})`
    model.value = model.value.slice(0, start) + md + model.value.slice(end)
    requestAnimationFrame(() => {
      const caret = start + md.length
      el.selectionStart = el.selectionEnd = caret
      el.focus()
    })
    return
  }
  // Escape to save edit or create
  if (e.key === 'Escape') {
    e.preventDefault()
    if (editingId.value) {
      saveEdit()
    } else if (auth.editing && (title.value.trim() || content.value.trim())) {
      create()
    }
  }
}

onMounted(() => {
  fetchPosts()
})
</script>

<style scoped>
.card {
  position: relative;
}
.card-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #232329; /* base.border */
  border-radius: 50%;
  background: #15151b; /* panel hover */
  color: #a1a1aa; /* base.sub */
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  z-index: 2;
  box-shadow: 0 1px 2px rgba(0,0,0,0.35);
  transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease, transform 120ms ease;
}
.card-close:hover {
  color: #fee2e2; /* rose-100 */
  background: #3f1a22; /* rose tint on dark */
  border-color: #7f1d1d; /* rose-900 */
  box-shadow: 0 4px 14px rgba(225, 29, 72, 0.25);
  transform: translateY(-1px);
}
.card-close:focus-visible {
  outline: 2px solid #e11d48;
  outline-offset: 2px;
}
/* X share button */
.card-xshare {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #232329; /* base.border */
  border-radius: 50%;
  background: #111114; /* panel base */
  color: #9ca3af; /* zinc-400 */
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 1px 2px rgba(0,0,0,0.35);
  transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease, transform 120ms ease;
}
.card-xshare:hover {
  color: #c7d2fe; /* indigo-200 */
  background: #16161b;
  box-shadow: 0 4px 14px rgba(79,70,229,0.25);
  transform: translateY(-1px);
}
.card-xshare:focus-visible {
  outline: 2px solid #6366f1; /* indigo-500 */
  outline-offset: 2px;
}
/* Full-card link overlay (non-edit mode only) */
.card-link-overlay {
  position: absolute;
  inset: 0;
  border-radius: 1rem; /* match .panel radius */
  z-index: 1; /* under buttons (z-2) */
}
/* Toast styles moved to UiToast component */
.uploading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a1a1aa;
  margin-top: 6px;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #27272a; /* zinc-800 */
  border-top-color: #22c55e; /* green-500 */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
