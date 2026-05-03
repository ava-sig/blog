<template>
  <!-- eslint-disable vue/no-v-html -->
  <main class="container-page py-8">
    <NuxtLink
      to="/"
      class="text-sm text-zinc-400 hover:text-zinc-200"
    >
      ← Back
    </NuxtLink>

    <section class="mt-4">
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
      <div
        v-else-if="!post"
        class="panel p-6 text-center"
      >
        Post not found.
      </div>
      <div
        v-else
        class="panel card card-art reveal in p-4 relative"
      >
        <a
          class="card-xshare focus-ring"
          :href="xShareUrl(post)"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          title="Share on X"
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

        <button
          v-if="auth.editing && !isEditing"
          class="btn-edit focus-ring"
          title="Edit"
          aria-label="Edit"
          @click="startEdit"
        >
          Edit
        </button>
        <template v-if="auth.editing && isEditing">
          <input
            v-model="editTitle"
            class="input !text-base !font-medium !mb-2"
            placeholder="Title"
            autofocus
            @keydown.enter.prevent="saveEdit"
            @keydown="onComposerKeydown"
          >
          <textarea
            v-model="editContent"
            class="input !min-h-[220px]"
            rows="8"
            placeholder="Content"
            @keydown="onComposerKeydown"
            @paste.stop="onPaste($event as any)"
          />
          <div
            v-if="uploading"
            class="inline-flex items-center gap-2 text-xs text-base-sub mt-2"
          >
            <span class="spinner" /> Uploading image…
          </div>
          <div class="mt-3 flex gap-2">
            <button
              class="btn-primary focus-ring"
              @click="saveEdit"
            >
              Save
            </button>
            <button
              class="btn-secondary focus-ring"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </template>
        <template v-else>
          <h4 class="m-0 mb-2 text-[21px] font-semibold leading-tight tracking-tight">
            {{ post.title }}
          </h4>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle"
            v-html="renderContent(post.content)"
          />
        </template>
        <div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60">
          Updated: {{ formatTs(post.updatedAt || post.createdAt) }}
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useRuntimeConfig, useAsyncData, useRequestURL } from 'nuxt/app'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/stores/auth'
import { useContent } from '~/composables/useContent'
import { useSlug } from '~/composables/useSlug'
import { usePasteMedia } from '~/composables/usePasteMedia'
import { useComposerKeys } from '~/composables/useComposerKeys'

const route = useRoute()
const router = useRouter()
const api = useApi()
const runtime = useRuntimeConfig()
const requestUrl = useRequestURL()

// Shared composables
const { renderContent, firstImageUrl } = useContent()
const { titleToSlug, canonicalSlug, postUrl, xShareUrl } = useSlug()

const error = ref('')
const post = ref<any | null>(null)
const auth = useAuth()
const isEditing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const uploading = ref(false)
const slug = computed(() => String(route.params.slug || ''))

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

function startEdit() {
  if (!auth.editing || !post.value) return
  isEditing.value = true
  nextTick(() => {
    // no-op placeholder for focus management
  })
}

function cancelEdit() {
  isEditing.value = false
  if (post.value) {
    editTitle.value = post.value.title
    editContent.value = post.value.content
  }
}

// removed local titleToSlug in favor of useSlug()

async function saveEdit() {
  if (!post.value) return
  try {
    const payload = {
      title: editTitle.value,
      content: editContent.value,
      slug: titleToSlug(editTitle.value),
      status: 'draft',
    }
    const updated = await api.put(`/posts/${post.value.id}`, payload)
    post.value = updated
    isEditing.value = false
  } catch (e: any) {
    error.value = e?.message || 'Failed to save post'
  }
}

const { onComposerKeydown } = useComposerKeys({
  isEditing,
  editContent,
  saveEdit,
})

const { onPaste } = usePasteMedia({
  authEditing: () => auth.editing,
  isEditing,
  editContent,
  uploading,
})


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

// removed local renderContent and canonical helpers in favor of composables

function findPost(list: any, currentSlug: string) {
  if (!Array.isArray(list)) return null
  const match = (p: any) => {
    const ts = titleToSlug(p?.title || '')
    return p?.id === currentSlug || p?.slug === currentSlug || (!!ts && ts === currentSlug)
  }
  return list.find(match) || null
}

const { data: postList, pending } = await useAsyncData(
  () => `post-list:${slug.value}`,
  () => api.get('/posts'),
  { watch: [slug] }
)

watch([postList, slug], ([list, currentSlug]) => {
  const nextPost = findPost(list, currentSlug)
  post.value = nextPost
  error.value = nextPost ? '' : 'Post not found'
  if (nextPost) {
    editTitle.value = nextPost.title
    editContent.value = nextPost.content
  }
}, { immediate: true })

watch(slug, () => {
  if (!post.value && !pending.value) {
    error.value = 'Post not found'
  }
})

watch(post, (current) => {
  if (!process.client || !current) return
  const want = canonicalSlug(current)
  if (want && want !== slug.value) router.replace({ path: `/p/${want}` })
}, { immediate: true })

async function recordOpenedMetric(id: string) {
  if (!id || typeof window === 'undefined') return
  const key = `metrics.opened.${id}`
  try {
    if (window.sessionStorage.getItem(key) === '1') return
  } catch {}
  try {
    const result = await api.post(`/posts/${id}/metric`, { kind: 'opened' })
    if (post.value && post.value.id === id && result?.metrics) {
      post.value = {
        ...post.value,
        metrics: result.metrics,
      }
    }
    try { window.sessionStorage.setItem(key, '1') } catch {}
  } catch {}
}

watch(post, (current) => {
  if (!process.client || !current?.id) return
  void recordOpenedMetric(current.id)
}, { immediate: true })

const loading = computed(() => pending.value)
const socialFallback = computed(() => String((runtime.public as any)?.socialFallback || ''))
const description = computed(() => extractDescription(post.value?.content || ''))
const socialImage = computed(() => firstImageUrl(post.value?.content || '') || socialFallback.value)
const pageUrl = computed(() => {
  if (post.value) return postUrl(post.value)
  const base = requestUrl?.origin || ''
  return base ? `${base}/p/${slug.value}` : `/p/${slug.value}`
})

useHead(() => {
  const meta: any[] = []
  if (post.value) {
    meta.push({ property: 'og:title', content: post.value.title || '' })
    meta.push({ property: 'og:type', content: 'article' })
    meta.push({ property: 'og:url', content: pageUrl.value })
    meta.push({ property: 'og:description', content: description.value })
    meta.push({ name: 'twitter:title', content: post.value.title || '' })
    meta.push({ name: 'twitter:description', content: description.value })
    if (socialImage.value) {
      meta.push({ name: 'twitter:card', content: 'summary_large_image' })
      meta.push({ property: 'og:image', content: socialImage.value })
      meta.push({ name: 'twitter:image', content: socialImage.value })
    } else {
      meta.push({ name: 'twitter:card', content: 'summary' })
    }
  }
  return {
    title: post.value?.title || 'Post',
    link: ([
      { rel: 'canonical', href: pageUrl.value },
      ...(socialImage.value ? [{ rel: 'preload', as: 'image', href: socialImage.value }] : []),
    ]) as any,
    meta,
  }
})
</script>

<style scoped>
.btn-edit {
  position: absolute;
  top: 8px;
  right: 44px; /* leave space for xshare */
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #232329;
  border-radius: 6px;
  background: #111114;
  color: #e5e7eb;
}
.prose-content {
  overflow-wrap: anywhere;
  word-break: break-word;
}
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
