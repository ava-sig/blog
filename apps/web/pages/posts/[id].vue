<template>
  <main style="padding:16px;max-width:800px;margin:0 auto">
    <h2>Edit Post</h2>
    <div v-if="!auth.editing" style="color:#b00">Editing is disabled</div>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error" style="color:#b00">{{ error }}</div>

    <form v-else @submit.prevent="save()" style="display:grid;gap:8px">
      <input v-model="title" placeholder="Title" required />
      <textarea v-model="content" placeholder="Content" rows="10" />
      <div style="display:flex;gap:8px">
        <button type="submit">Save</button>
        <button type="button" @click="goBack">Cancel</button>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const api = useApi()
const auth = useAuth()

const id = String(route.params.id || '')
const title = ref('')
const content = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const p = await api.get<any>(`/posts/${id}`)
    title.value = p.title
    content.value = p.content
  } catch (e: any) {
    const msg = e?.message || 'Failed to load post'
    error.value = msg
    if (/not\s*found/i.test(msg)) {
      router.replace({ path: '/', query: { missing: '1' } })
      return
    }
  } finally {
    loading.value = false
  }
}

function slugify(t: string) {
  return (t || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function save() {
  try {
    await api.put(`/posts/${id}`, {
      title: title.value,
      content: content.value,
      slug: slugify(title.value),
      status: 'draft',
    })
    router.push('/')
  } catch (e: any) {
    error.value = e?.message || 'Failed to save post'
  }
}

function goBack() { router.push('/') }

onMounted(() => {
  // If editing disabled, bounce to home
  if (!auth.editing) {
    auth.loadFromStorage()
    if (!auth.editing) {
      router.replace('/')
      return
    }
  }
  load()
})

watchEffect(() => {
  // live-guard route if editing state changes
  if (!auth.editing) router.replace('/')
})
</script>
