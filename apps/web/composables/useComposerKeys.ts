import type { Ref } from 'vue'

export interface ComposerKeyOptions {
  // Editing state
  isEditing?: Ref<boolean>
  editingId?: Ref<string | null>
  // Models
  editContent: Ref<string>
  newContent?: Ref<string>
  title?: Ref<string>
  // Actions
  saveEdit?: () => void
  createNew?: () => void
}

export function useComposerKeys(opts: ComposerKeyOptions) {
  function _activeIs(className: string) {
    const el = document.activeElement as HTMLElement | null
    return !!(el && el.classList && el.classList.contains(className))
  }

  function modelForActive(el: HTMLTextAreaElement | null) {
    if (!el) return opts.editContent
    const isEdit = el.classList.contains('content-input')
    const isNew = el.classList.contains('new-content-input')
    if (isEdit) return opts.editContent
    if (isNew && opts.newContent) return opts.newContent
    return opts.editContent
  }

  function onComposerKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null
    const isTextarea = target instanceof HTMLTextAreaElement

    // Escape: save edit or create new
    if (e.key === 'Escape') {
      e.preventDefault()
      if (opts.isEditing?.value || opts.editingId?.value) {
        opts.saveEdit?.()
      } else if (opts.createNew && (opts.title?.value?.trim() || opts.newContent?.value?.trim())) {
        opts.createNew()
      }
      return
    }

    // Ctrl/Cmd+K link insertion for textareas
    if (isTextarea && (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const el = target as HTMLTextAreaElement
      const model = modelForActive(el)
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
  }

  return { onComposerKeydown }
}
