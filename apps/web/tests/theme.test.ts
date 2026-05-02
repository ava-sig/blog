// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchMock = vi.fn()

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { apiBase: 'https://api.example.com' } }),
}))

import { useTheme } from '../stores/theme'

describe('useTheme', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('persists explicit local choices', () => {
    const theme = useTheme()
    theme.setTheme('dark')

    expect(theme.theme).toBe('dark')
    expect(localStorage.getItem('ui.theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies the server default without persisting a local override', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ defaultTheme: 'dark' }),
    })

    const theme = useTheme()
    await theme.load()

    expect(theme.theme).toBe('dark')
    expect(localStorage.getItem('ui.theme')).toBeNull()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('prefers an existing local override over the server default', async () => {
    localStorage.setItem('ui.theme', 'light')
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ defaultTheme: 'dark' }),
    })

    const theme = useTheme()
    await theme.load()

    expect(theme.theme).toBe('light')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
