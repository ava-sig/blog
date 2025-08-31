// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useComposerKeys } from '../composables/useComposerKeys'

describe('useComposerKeys', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Escape triggers saveEdit when editing', () => {
    const saveEdit = vi.fn()
    const opts = {
      isEditing: ref(true),
      editingId: ref('1'),
      editContent: ref('hello'),
      newContent: ref(''),
      title: ref(''),
      saveEdit,
    }
    const { onComposerKeydown } = useComposerKeys(opts)
    const e = new KeyboardEvent('keydown', { key: 'Escape' })
    onComposerKeydown(e)
    expect(saveEdit).toHaveBeenCalled()
  })

  it('Escape triggers createNew when not editing and title/newContent present', () => {
    const createNew = vi.fn()
    const opts = {
      isEditing: ref(false),
      editingId: ref(null),
      editContent: ref(''),
      newContent: ref('text'),
      title: ref('My Title'),
      createNew,
    }
    const { onComposerKeydown } = useComposerKeys(opts)
    const e = new KeyboardEvent('keydown', { key: 'Escape' })
    onComposerKeydown(e)
    expect(createNew).toHaveBeenCalled()
  })

  it('Ctrl/Cmd+K inserts markdown link in textarea', async () => {
    const opts = {
      editContent: ref('start and end'),
      newContent: ref(''),
    }
    const { onComposerKeydown } = useComposerKeys(opts as any)

    // Create a textarea to act as target
    const ta = document.createElement('textarea')
    ta.className = 'content-input'
    ta.value = 'start and end'
    document.body.appendChild(ta)
    ta.focus()
    // Select the word 'and'
    ta.selectionStart = 6
    ta.selectionEnd = 9

    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com')

    const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    Object.defineProperty(e, 'target', { value: ta })

    onComposerKeydown(e)

    // Wait for RAF callbacks
    await new Promise((r) => setTimeout(r))

    expect(opts.editContent.value).toContain('[and](https://example.com)')
  })
})
