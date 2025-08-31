import { useRuntimeConfig } from 'nuxt/app'
import type { Ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { useGiphy } from '~/composables/useGiphy'

export interface PasteOptions {
  authEditing: () => boolean
  isEditing?: Ref<boolean>
  editingId?: Ref<string | null>
  editContent: Ref<string>
  newContent?: Ref<string>
  uploading: Ref<boolean>
  showToast?: (msg: string, type?: 'success' | 'error') => void
}

export function usePasteMedia(opts: PasteOptions) {
  const api = useApi()
  const runtime = useRuntimeConfig()
  const apiBase = String((runtime.public as any)?.apiBase || '').replace(/\/$/, '')
  const { extractGiphyId } = useGiphy()

  function activeIs(selectorClass: string) {
    const el = (document.activeElement as HTMLElement | null)
    return !!(el && el.classList && el.classList.contains(selectorClass))
  }

  function getActiveTextarea(): HTMLTextAreaElement | null {
    const el = document.activeElement as HTMLTextAreaElement | null
    return el && el.tagName === 'TEXTAREA' ? el : null
  }

  function insertMarkdown(md: string) {
    const el = getActiveTextarea()
    // Decide which model to mutate
    const useEdit = activeIs('content-input') || (!!opts.isEditing?.value)
    const model = useEdit ? opts.editContent : (opts.newContent || opts.editContent)
    if (el) {
      const start = el.selectionStart ?? model.value.length
      const end = el.selectionEnd ?? model.value.length
      model.value = model.value.slice(0, start) + md + model.value.slice(end)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + md.length })
    } else {
      model.value += md
    }
  }

  async function onPaste(e: ClipboardEvent) {
    // Respect edit-mode guards
    if (!opts.authEditing()) return
    if (opts.isEditing && !opts.isEditing.value && opts.editingId && !opts.editingId.value && !opts.newContent) return
    if (opts.uploading.value) return

    // Try to get an image File from clipboard
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

    // If no file, handle Giphy URLs quickly
    if (!file) {
      const text = e.clipboardData?.getData('text/plain') || ''
      if (text) {
        const id = extractGiphyId(text)
        if (id) {
          e.preventDefault()
          const gifUrl = `https://media.giphy.com/media/${id}/giphy.gif`
          insertMarkdown(`\n![gif](${gifUrl})\n`)
          return
        }
      }
      return
    }

    // Validate it's an image by mime or header
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
      opts.showToast?.('Pasted content is not an image', 'error')
      return
    }

    e.preventDefault()
    try {
      opts.uploading.value = true
      const { url } = await api.upload('/api/upload', 'image', file)
      const finalUrl = url.startsWith('/uploads/') ? `${apiBase}${url}` : url
      insertMarkdown(`\n![image](${finalUrl})\n`)
    } catch (err: any) {
      opts.showToast?.(err?.message || 'Upload failed', 'error')
    } finally {
      opts.uploading.value = false
    }
  }

  return { onPaste }
}
