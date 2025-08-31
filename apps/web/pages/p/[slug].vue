<template>
  <main class="container-page py-8">
    <NuxtLink to="/" class="text-sm text-zinc-400 hover:text-zinc-200">← Back</NuxtLink>

    <section class="mt-4">
      <div v-if="loading" class="text-base-sub">Loading...</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else-if="!post" class="panel p-6 text-center">Post not found.</div>
      <div v-else class="panel card card-art reveal in p-4 relative">
        <a
          class="card-xshare focus-ring"
          :href="xShareUrl(post)"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          title="Share on X"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.27l-5.38-7.04-6.15 7.04H1.43l7.73-8.84L1 2.25h7.03l4.86 6.5 5.354-6.5zm-1.16 18.24h1.832L7.01 4.13H5.06l12.025 16.36z"/>
          </svg>
        </a>

        <h4 class="m-0 mb-2 text-[21px] font-semibold leading-tight tracking-tight">{{ post.title }}</h4>
        <div class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle" v-html="renderContent(post.content)"></div>
        <div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60">Updated: {{ formatTs(post.updatedAt || post.createdAt) }}</div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useRuntimeConfig } from 'nuxt/app'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const api = useApi()
const runtime = useRuntimeConfig()
const apiBase = ((runtime.public as any)?.apiBase || '').replace(/\/$/, '')

const loading = ref(false)
const error = ref('')
const post = ref<any | null>(null)

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

function extractDescription(text: string): string {
  if (!text) return ''
  // Take first non-empty line/paragraph, strip markdown image and link syntax
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
  const first = lines.find(s => !s.startsWith('![')) || ''
  if (!first) return ''
  const noMd = first
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1') // links -> text
    .replace(/\s+/g, ' ')
    .trim()
  return noMd.slice(0, 240)
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderContent(text: string) {
  if (!text) return ''
  const escaped = escapeHtml(text)
  const withImages = escaped.replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, url) => {
    let u = String(url).trim()
    u = u.replace(/^<|>$/g, '')
    u = u.replace(/^"+|"+$/g, '')
    u = u.replace(/[)]+$/g, '')
    if (u.startsWith('/uploads/')) u = `${apiBase}${u}`
    return `<img src="${u}" alt="" />\n`
  })
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
  // SSR fallback: relative
  return `/p/${slug}`
}

function xShareUrl(p: any): string {
  const text = encodeURIComponent(p?.title || '')
  const url = encodeURIComponent(postUrl(p))
  return `https://x.com/intent/tweet?text=${text}&url=${url}`
}

async function fetchOne() {
  loading.value = true
  error.value = ''
  try {
    const slug = route.params.slug as string
    // Conservative: fetch list then find by slug to avoid backend coupling
    const list = await api.get('/posts')
    const match = (p: any) => {
      const ts = titleToSlug(p?.title || '')
      return p?.id === slug || p?.slug === slug || (!!ts && ts === slug)
    }
    post.value = Array.isArray(list) ? list.find(match) || null : null
    if (!post.value) error.value = 'Post not found'
    // Normalize URL to canonical slug (prefer title-based)
    if (post.value) {
      const want = canonicalSlug(post.value)
      if (want && want !== slug) router.replace({ path: `/p/${want}` })
      // Set SEO and social sharing tags (Twitter Card / Open Graph)
      const img = firstImageUrl(post.value?.content || '')
      const pageUrl = postUrl(post.value)
      const desc = extractDescription(post.value?.content || '')
      const meta: any[] = [
        { property: 'og:title', content: post.value.title || '' },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: pageUrl },
        { property: 'og:description', content: desc },
        { name: 'twitter:title', content: post.value.title || '' },
        { name: 'twitter:description', content: desc },
      ]
      if (img) {
        meta.push({ name: 'twitter:card', content: 'summary_large_image' })
        meta.push({ property: 'og:image', content: img })
        meta.push({ name: 'twitter:image', content: img })
      } else {
        meta.push({ name: 'twitter:card', content: 'summary' })
      }
      useHead({
        title: post.value.title || 'Post',
        link: [
          { rel: 'canonical', href: pageUrl },
          ...(img ? [{ rel: 'preload', as: 'image', href: img }] : []),
        ],
        meta,
      })
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load post'
  } finally {
    loading.value = false
  }
}

function firstImageUrl(text: string): string | '' {
  if (!text) return ''
  // Match markdown image ![alt](url "title") and capture URL
  const m = text.match(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/)
  if (!m) return ''
  let u = String(m[1] || '').trim()
  u = u.replace(/^<|>$/g, '')
  u = u.replace(/^"+|"+$/g, '')
  u = u.replace(/[)]+$/g, '')
  if (!u) return ''
  // If it's an /uploads path, prefix with API base for absolute URL
  if (u.startsWith('/uploads/')) return `${apiBase}${u}`
  return u
}

onMounted(() => {
  fetchOne()
})
</script>

<style scoped>
/* X share button (match index card) */
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
</style>
