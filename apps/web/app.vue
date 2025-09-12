<template>
  <div>
    <header class="border-b border-base-border bg-base-panel">
      <div class="container-page h-14 flex items-center justify-between gap-4">
        <nav class="flex items-center gap-4 text-base-text">
          <ClientOnly>
            <template #fallback>
              <strong class="tracking-tight">Glyphic Blog</strong>
            </template>
            <template v-if="editingTitle">
              <input
                v-model="siteTitle"
                class="input !py-1 !px-2 !h-8 !text-sm"
                placeholder="Site title"
                autofocus
                @blur="saveTitle"
                @keydown.enter.prevent="saveTitle"
                @keydown.escape.prevent="saveTitle"
              >
            </template>
            <template v-else>
              <strong
                class="tracking-tight cursor-text"
                :title="auth.editing ? 'Click to edit title' : ''"
                @click="onTitleClick"
              >{{ siteTitle }}</strong>
            </template>
          </ClientOnly>
          <NuxtLink
            class="text-base-sub hover:text-base-text transition"
            to="/"
          >
            Home
          </NuxtLink>
        </nav>
        <ClientOnly>
          <template #fallback>
            <span
              class="edit-indicator"
              aria-hidden="true"
            />
          </template>
          <div class="flex items-center gap-[10px]">
            <!-- Theme toggle: visible only in edit mode -->
            <button
              v-if="auth.editing"
              class="theme-indicator"
              :aria-label="`Switch to ${theme.theme === 'dark' ? 'light' : 'dark'} theme`"
              :title="`Theme: ${theme.theme}`"
              @click="theme.toggleTheme()"
            />
            <button
              class="edit-indicator"
              :class="{ on: auth.editing }"
              aria-label="Edit mode status"
              title="Edit mode"
              @click="onIndicatorClick"
            />
          </div>
        </ClientOnly>
      </div>
    </header>
    <div
      v-if="showLogin"
      class="modal-backdrop"
      @click.self="closeLogin"
    >
      <div class="modal">
        <h4 style="margin:0 0 8px">
          Enter JWT
        </h4>
        <p style="margin:0 0 8px;color:#666">
          Paste your JWT to enable edit mode.
        </p>
        <textarea
          v-model="tokenInput"
          rows="4"
          placeholder="eyJhbGciOi..."
          style="width:100%;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
        />
        <div
          v-if="loginError"
          style="color:#b00;margin-top:6px"
        >
          {{ loginError }}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
          <button
            class="btn"
            @click="closeLogin"
          >
            Cancel
          </button>
          <button
            class="btn primary"
            @click="submitToken"
          >
            Enable Edit
          </button>
        </div>
      </div>
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <footer class="border-t border-base-border bg-base-panel/60">
      <div class="container-page py-6 text-center text-xs text-base-sub">
        Powered by
        <a
          href="https://github.com/ava-sig/blog"
          class="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Blog
        </a>
        <span v-if="appVersion">&nbsp;v{{ appVersion }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { useErrors } from '~/composables/useErrors'
import { useTheme } from '~/stores/theme'

const auth = useAuth()
const theme = useTheme()
const route = useRoute()
const router = useRouter()
const showLogin = ref(false)
const tokenInput = ref('')
const loginError = ref('')
const { formatApiError } = useErrors()

// Editable site title
const siteTitle = ref('Glyphic Blog')
const editingTitle = ref(false)

// App version from runtime config
const runtime = useRuntimeConfig()
const appVersion = (runtime.public as any)?.appVersion || ''

// Synchronous init to avoid flicker before first paint
if (typeof window !== 'undefined') {
  const sp = new URLSearchParams(window.location.search)
  const token = sp.get('token')
  if (token) {
    try {
      localStorage.setItem('token', token)
      sessionStorage.setItem('auth.session', '1')
    } catch {}
    auth.setToken(token)
  } else {
    try {
      const sessionOk = sessionStorage.getItem('auth.session') === '1'
      if (sessionOk) auth.loadFromStorage()
      else auth.clearToken()
    } catch { auth.loadFromStorage() }
    // Load persisted site title
    try {
      const t = localStorage.getItem('site.title')
      if (t && t.trim()) siteTitle.value = t
    } catch {}
  }
}

function onIndicatorClick() {
  // Toggle behavior: if ON, clear session (logout). If OFF, no-op per governance.
  if (auth.editing) {
    auth.clearToken()
    router.replace({ path: route.path, query: {} })
  } else {
    tokenInput.value = ''
    loginError.value = ''
    showLogin.value = true
  }
}

onMounted(() => {
  // Clean the URL (remove token qp) after mount to avoid full reload
  const q = route.query?.token
  if (typeof q === 'string' && q.length > 0) {
    router.replace({ path: route.path, query: {} })
  }
})

function closeLogin() {
  showLogin.value = false
}

function onTitleClick() {
  if (!auth.editing) return
  editingTitle.value = true
  // Focus handled by autofocus on input
}

function saveTitle() {
  editingTitle.value = false
  const t = siteTitle.value?.trim() || 'Glyphic Blog'
  siteTitle.value = t
  try { localStorage.setItem('site.title', t) } catch {}
}

function base64UrlDecode(str: string): string {
  try {
    // Replace URL-safe chars and pad
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = str.length % 4
    if (pad) str += '='.repeat(4 - pad)
    if (typeof atob !== 'undefined') return decodeURIComponent(escape(atob(str)))
    // Node fallback (not expected in browser runtime)
    return Buffer.from(str, 'base64').toString('utf8')
  } catch { return '' }
}

function validateJwtFormatAndExpiry(token: string): { ok: boolean; reason?: string } {
  if (typeof token !== 'string') return { ok: false, reason: 'Token must be a string' }
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'Invalid JWT format' }
  try {
    const payloadJson = base64UrlDecode(parts[1])
    const payload = JSON.parse(payloadJson)
    if (payload && typeof payload === 'object' && typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000)
      if (payload.exp < nowSec) return { ok: false, reason: 'Token expired' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'Invalid JWT payload' }
  }
}

function persistToken(token: string): void {
  try {
    localStorage.setItem('token', token)
    sessionStorage.setItem('auth.session', '1')
  } catch {}
}

async function submitToken() {
  loginError.value = ''
  const t = tokenInput.value.trim()
  const res = validateJwtFormatAndExpiry(t)
  if (!res.ok) {
    loginError.value = res.reason || 'Invalid token'
    return
  }
  // Verify authorization server-side before enabling edit mode
  try {
    const cfg = useRuntimeConfig()
    const base = (cfg.public as any)?.apiBase || ''
    const url = `${String(base).replace(/\/$/, '')}/api/authz`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` } })
    if (!r.ok) {
      // Attempt to parse structured error
      let code = ''
      let desc = ''
      try {
        const txt = await r.text()
        const data = txt ? JSON.parse(txt) : {}
        if (typeof data.error === 'string') code = data.error
        if (typeof data.error_description === 'string') desc = data.error_description
      } catch {}
      const info = formatApiError(Object.assign(new Error(`${r.status} ${r.statusText}`), { status: r.status, code, description: desc }))
      loginError.value = info.title
      return
    }
    // Authorized -> persist and enable editing
    auth.setToken(t)
    persistToken(t)
    showLogin.value = false
  } catch (e: any) {
    const info = formatApiError(e)
    loginError.value = info.title
  }
}
</script>

<style>
html, body, #__nuxt { height: 100%; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }

.edit-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3f3f46; /* zinc-700 */
  box-shadow: inset 0 0 0 2px #18181b; /* zinc-900 */
  opacity: 0.9;
  transition: background 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  border: none;
  cursor: pointer;
}
.edit-indicator.on {
  background: #22c55e; /* green-500 */
  box-shadow: 0 0 8px 3px rgba(34, 197, 94, 0.35);
  opacity: 1;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  width: min(560px, 92vw);
  background: #0f0f14;
  border: 1px solid #232329;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.45);
}
.btn {
  appearance: none;
  border: 1px solid #232329;
  background: #15151b;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #e5e7eb;
}
.btn.primary {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #fff;
}
/* Theme CSS variables: default light, override in .dark */
:root {
  /* base color channels as r g b (match Tailwind's rgb(var(--...)) usage) */
  --base-bg: 250 250 250;        /* light bg */
  --base-panel: 255 255 255;     /* light panel */
  --base-border: 229 231 235;    /* zinc-200 */
  --base-text: 17 24 39;         /* gray-900 */
  --base-sub: 107 114 128;       /* gray-500 */
}

.dark:root {
  --base-bg: 11 11 15;
  --base-panel: 15 15 20;
  --base-border: 35 35 41;
  --base-text: 229 231 235;
  --base-sub: 161 161 170;
}

/* Theme indicator, visually minimal */
.theme-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  opacity: 0.95;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  /* Light mode hint */
  background: radial-gradient(circle at 65% 35%, #fde68a 15%, #f59e0b 45%, #2563eb 85%);
  box-shadow: inset 0 0 0 2px rgba(0,0,0,0.35);
}
.dark .theme-indicator {
  /* Dark mode hint */
  background: radial-gradient(circle at 65% 35%, #93c5fd 15%, #2563eb 45%, #0ea5e9 85%);
  box-shadow: 0 0 8px 2px rgba(59,130,246,0.35);
}
.theme-indicator:hover { opacity: 1; transform: translateY(-1px); }
.theme-indicator:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
</style>
