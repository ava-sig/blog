<template>
  <!-- eslint-disable vue/no-v-html -->
  <main class="container-page py-8">
    <h2 class="text-xl font-semibold tracking-tight text-base-text mb-4">
      Posts
    </h2>

    <section
      v-if="auth.editing"
      class="panel-muted p-4 mt-4"
    >
      <h3 class="text-base font-medium mb-3">
        New Post
      </h3>
      <form
        class="grid gap-3"
        @submit.prevent="create()"
      >
        <label class="block">
          <span class="block text-xs text-base-sub mb-1">Title</span>
          <input
            v-model="title"
            class="input new-title-input"
            placeholder="Title"
            required
            @keydown="onComposerKeydown"
          >
        </label>
        <label class="block">
          <span class="block text-xs text-base-sub mb-1">Content</span>
          <textarea
            v-model="content"
            class="input new-content-input"
            placeholder="Content"
            rows="6"
            @keydown="onComposerKeydown"
            @paste.stop="onPaste($event as any)"
          />
        </label>
        <div
          v-if="uploading"
          class="uploading inline-flex items-center gap-2 text-xs text-base-sub -mt-1"
        >
          <span class="spinner" /> Uploading image…
        </div>
        <div class="flex justify-end">
          <button
            class="btn-primary focus-ring"
            type="submit"
          >
            Create
          </button>
        </div>
      </form>
    </section>

    <section class="mt-6">
      <div
        v-if="route.query.missing === '1'"
        class="border border-rose-900/60 bg-rose-900/20 text-rose-300 rounded-md px-3 py-2 mb-3"
      >
        The post you tried to edit was not found.
      </div>
      <div
        v-if="loading"
        class="text-base-sub"
      >
        Loading...
      </div>
      <div
        v-else-if="error"
        class="text-rose-400"
      >
        {{ error }}
      </div>
      <template v-else>
        <div
          v-if="posts.length === 0"
          class="panel p-6 text-center"
        >
          <div class="text-base-sub mb-2">
            No posts yet
          </div>
          <div class="text-sm text-zinc-400">
            Use edit mode to create your first post. Paste an image to attach quickly.
          </div>
        </div>
        <ul
          v-else
          class="list-none p-0 grid gap-3"
        >
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
            <div
              class="timeline"
              aria-hidden="true"
            />
            <button
              v-if="auth.editing"
              class="card-close focus-ring"
              aria-label="Delete post"
              title="Delete"
              @click.stop="remove(p.id)"
            >
              ×
            </button>
            <a
              class="card-xshare focus-ring"
              :href="xShareUrl(p)"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on X"
              title="Share on X"
              @click.stop
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.27l-5.38-7.04-6.15 7.04H1.43l7.73-8.84L1 2.25h7.03l4.86 6.5 5.354-6.5zm-1.16 18.24h1.832L7.01 4.13H5.06l12.025 16.36z" />
              </svg>
            </a>

            <template v-if="editingId === p.id">
              <input
                v-model="editTitle"
                class="title-input input !text-base !font-medium !mb-2"
                placeholder="Title"
                autofocus
                @blur="onEditBlur"
                @keydown.enter.prevent="saveEdit"
                @keydown="onComposerKeydown"
                @click.stop
              >
              <textarea
                v-model="editContent"
                class="content-input input !min-h-[180px]"
                rows="6"
                placeholder="Content"
                @blur="onEditBlur"
                @keydown="onComposerKeydown"
                @click.stop
              />
              <div
                v-if="uploading"
                class="uploading inline-flex items-center gap-2 text-xs text-base-sub mt-2"
              >
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
              <!-- eslint-disable vue/no-v-html -->
              <div
                class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle"
                v-html="renderContent(p.content)"
              />
              <!-- eslint-enable vue/no-v-html -->
            </template>

            <div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60">
              Updated: {{ formatTs(p.updatedAt || p.createdAt) }}
            </div>
          </li>
        </ul>
      </template>
    </section>
  </main>
  <UiToast
    :visible="toastVisible"
    :type="toastType"
    :message="toastMsg"
  />
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useHead, useRuntimeConfig, useAsyncData } from 'nuxt/app'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/stores/auth'
import { useContent } from '~/composables/useContent'
import { useSlug } from '~/composables/useSlug'
import { usePasteMedia } from '~/composables/usePasteMedia'
import { useComposerKeys } from '~/composables/useComposerKeys'
import { useApi } from '~/composables/useApi'
import { useErrors } from '~/composables/useErrors'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const api = useApi()
// no runtime needed here

// Shared composables
const { renderContent, firstImageUrl: _firstImageUrl } = useContent()
const { titleToSlug, canonicalSlug, postUrl: _postUrl, xShareUrl } = useSlug()
// Error formatting helper
const { formatApiError } = useErrors()

// SEO: homepage head tags and optional preload of fallback social image
const runtime = useRuntimeConfig()
const socialFallback = (runtime.public as any)?.socialFallback || ''
useHead({
  title: 'Posts',
  link: ([
    { rel: 'canonical', href: '/' },
    ...(socialFallback ? [{ rel: 'preload', as: 'image', href: socialFallback }] : []),
  ]) as any,
  meta: ([
    { property: 'og:title', content: 'Posts' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: '/' },
    ...(socialFallback ? [
      { property: 'og:image', content: socialFallback },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: socialFallback },
    ] : [
      { name: 'twitter:card', content: 'summary' },
    ]),
  ]) as any,
})

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
// removed paste dedupe guards (handled by composable if needed)

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
    // Deterministic across SSR/CSR: fixed locale and UTC timezone
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    }).format(d)
  } catch {
    return input
  }
}


// Removed unused fetchPosts; SSR path now provides initial data via useAsyncData


function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  toastVisible.value = true
  window.clearTimeout((showToast as any)._t)
  ;(showToast as any)._t = window.setTimeout(() => (toastVisible.value = false), 1600)
}

// slug helpers provided by useSlug()

async function create() {
  try {
    const payload = {
      title: title.value,
      content: content.value,
      slug: titleToSlug(title.value),
      status: 'draft',
    }
    const created = await api.post('/posts', payload)
    posts.value.unshift(created)
    title.value = ''
    content.value = ''
    await nextTick()
    setupReveal()
  } catch (e: any) {
    const info = formatApiError(e)
    error.value = info.title
    showToast(info.title, 'error')
  }
}

async function remove(id: string) {
  try {
    await api.del(`/posts/${id}`)
    posts.value = posts.value.filter(p => p.id !== id)
    showToast('Deleted', 'success')
  } catch (e: any) {
    const info = formatApiError(e)
    error.value = info.title
    showToast(info.title, 'error')
  }
}

function _gotoEdit(id: string) {
  router.push(`/posts/${id}`)
}

function startEdit(p: any) {
  if (!auth.editing) return
  if (editingId.value === p.id) return
  editingId.value = p.id
  editTitle.value = p.title
  editContent.value = p.content
}

function onCardClick(p: any, _e: MouseEvent) {
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
      slug: titleToSlug(editTitle.value),
      status: 'draft',
    }
    const updated = await api.put(`/posts/${id}`, payload)
    const i = posts.value.findIndex(x => x.id === id)
    if (i !== -1) posts.value[i] = updated
    showToast('Saved', 'success')
  } catch (e: any) {
    const info = formatApiError(e)
    error.value = info.title
    showToast(info.title, 'error')
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

// Removed local helpers in favor of composables above

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

// Hook up composables for paste handling and keybindings
const { onPaste } = usePasteMedia({
  authEditing: () => auth.editing,
  editingId,
  editContent,
  newContent: content,
  uploading,
  showToast,
})

const { onComposerKeydown } = useComposerKeys({
  editingId,
  editContent,
  newContent: content,
  title,
  saveEdit,
  createNew: create,
})

// SSR: fetch initial posts on server to avoid hydration mismatch
const apiBaseForSSR = (runtime.public as any)?.apiBase || ''
try {
  const { data: ssrPosts, error: ssrErr } = await useAsyncData('posts', () =>
    $fetch(`${String(apiBaseForSSR).replace(/\/$/, '')}/api/posts`)
  )
  if (!ssrErr?.value && Array.isArray(ssrPosts?.value)) {
    posts.value = ssrPosts.value as any[]
  }
} catch {}

onMounted(async () => {
  await nextTick()
  setupReveal()
})
</script>

<style scoped>
.prose-content {
  white-space: pre-wrap; /* preserve newlines and blank lines */
}
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
