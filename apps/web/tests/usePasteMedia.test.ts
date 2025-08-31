// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { usePasteMedia } from '../composables/usePasteMedia'

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { apiBase: 'http://localhost:3000' } }),
}))

vi.mock('~/composables/useApi', () => {
  return {
    useApi: () => ({
      upload: vi.fn(async (_path: string, _field: string, _file: File) => {
        return { url: '/uploads/abc.png' }
      }),
    }),
  }
})

vi.mock('~/composables/useGiphy', () => ({
  useGiphy: () => ({ extractGiphyId: (raw: string) => (raw.includes('giphy') ? 'AbCd123' : '') }),
}))

describe('usePasteMedia', () => {
  const mkOpts = () => {
    return {
      authEditing: () => true,
      isEditing: ref(true),
      editingId: ref('1'),
      editContent: ref(''),
      newContent: ref(''),
      uploading: ref(false),
      showToast: vi.fn(),
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('inserts markdown for Giphy URL from clipboard text', async () => {
    const opts = mkOpts()
    const { onPaste } = usePasteMedia(opts)

    const prevent = vi.fn()
    const ev: any = {
      preventDefault: prevent,
      clipboardData: {
        items: [],
        files: [],
        getData: (t: string) => (t === 'text/plain' ? 'https://i.giphy.com/AbCd123.gif' : ''),
      },
    }

    await onPaste(ev as ClipboardEvent)

    expect(prevent).toHaveBeenCalled()
    expect(opts.editContent.value || opts.newContent.value).toContain('![gif](https://media.giphy.com/media/AbCd123/giphy.gif)')
  })

  it('uploads image file and inserts markdown with absolute URL', async () => {
    const opts = mkOpts()
    const { onPaste } = usePasteMedia(opts)

    // Minimal PNG header
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])
    const file = new File([bytes], 'img.png', { type: 'image/png' })
    ;(file as any).slice = vi.fn(() => ({ arrayBuffer: async () => bytes.buffer }))

    const prevent = vi.fn()
    const ev: any = {
      preventDefault: prevent,
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        files: [file],
        getData: () => '',
      },
    }

    await onPaste(ev as ClipboardEvent)
    expect(prevent).toHaveBeenCalled()
    expect(opts.editContent.value || opts.newContent.value).toContain('![image](http://localhost:3000/uploads/abc.png)')
  })

  it('shows error toast for non-image file', async () => {
    const opts = mkOpts()
    const { onPaste } = usePasteMedia(opts)

    const badBytes = new Uint8Array([1, 2, 3, 4])
    const bad = new File([badBytes], 'note.txt', { type: 'text/plain' })
    ;(bad as any).slice = vi.fn(() => ({ arrayBuffer: async () => badBytes.buffer }))

    const ev: any = {
      clipboardData: {
        items: [{ kind: 'file', type: 'text/plain', getAsFile: () => bad }],
        files: [bad],
        getData: () => '',
      },
    }

    await onPaste(ev as ClipboardEvent)
    expect(opts.showToast).toHaveBeenCalled()
    const msg = (opts.showToast as any).mock.calls[0][0]
    expect(String(msg)).toMatch(/not an image/i)
  })
})
