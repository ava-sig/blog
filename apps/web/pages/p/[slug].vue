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
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useRuntimeConfig } from 'nuxt/app'
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
// runtime used for SEO meta fallback, no apiBase needed here

// Shared composables
const { renderContent, firstImageUrl } = useContent()
const { titleToSlug, canonicalSlug, postUrl, xShareUrl } = useSlug()

const loading = ref(false)
const error = ref('')
const post = ref<any | null>(null)
const auth = useAuth()
const isEditing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const uploading = ref(false)

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
    // ensure head reflects new title
    useHead({ title: post.value.title || 'Post' })
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
      const fallback = (runtime.public as any)?.socialFallback || ''
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
        if (fallback) {
          meta.push({ name: 'twitter:card', content: 'summary_large_image' })
          meta.push({ property: 'og:image', content: fallback })
          meta.push({ name: 'twitter:image', content: fallback })
        } else {
          meta.push({ name: 'twitter:card', content: 'summary' })
        }
      }
      useHead({
        title: post.value.title || 'Post',
        link: ([
          { rel: 'canonical', href: pageUrl },
          ...(img ? [{ rel: 'preload', as: 'image', href: img }] : (fallback ? [{ rel: 'preload', as: 'image', href: fallback }] : [])),
        ]) as any,
        meta,
      })
      // Prepare edit buffers
      editTitle.value = post.value.title
      editContent.value = post.value.content
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load post'
  } finally {
    loading.value = false
  }
}

// firstImageUrl provided by useContent()

onMounted(() => {
  fetchOne()
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
  white-space: pre-wrap; /* preserve newlines and blank lines */
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
