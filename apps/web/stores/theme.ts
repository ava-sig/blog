import { defineStore } from 'pinia'
import { useRuntimeConfig } from 'nuxt/app'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
}

export const useTheme = defineStore('theme', {
  state: (): ThemeState => ({
    theme: 'light', // default theme
  }),
  actions: {
    applyTheme(next: Theme, options?: { persist?: boolean }) {
      this.theme = next
      this.applyThemeClass()
      if (options?.persist !== false) this.persist()
    },
    setTheme(next: Theme) {
      this.applyTheme(next, { persist: true })
    },
    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    },
    applyThemeClass() {
      if (typeof document === 'undefined') return
      const el = document.documentElement
      if (this.theme === 'dark') el.classList.add('dark')
      else el.classList.remove('dark')
    },
    persist() {
      try { localStorage.setItem('ui.theme', this.theme) } catch {}
    },
    async load() {
      if (typeof window === 'undefined') return
      // Local preference takes precedence.
      try {
        const t = (localStorage.getItem('ui.theme') as Theme) || ''
        if (t === 'dark' || t === 'light') {
          this.applyTheme(t, { persist: false })
          return
        }
      } catch {}

      // Fallback to server default if available. Do not persist it locally:
      // guests should keep following the current server default until they
      // explicitly choose a theme for themselves.
      try {
        const cfg = useRuntimeConfig()
        const base = (cfg.public as any)?.apiBase || ''
        const url = `${String(base).replace(/\/$/, '')}/api/settings`
        const r = await fetch(url)
        if (r.ok) {
          const data = await r.json()
          const dt = data?.defaultTheme
          if (dt === 'dark' || dt === 'light') {
            this.applyTheme(dt, { persist: false })
            return
          }
        }
      } catch {}

      // Final fallback
      this.applyTheme('light', { persist: false })
    },
  },
})

// Auto-load on first import (client-side)
if (typeof window !== 'undefined') {
  try {
    const store = (useTheme as any)()
    if (store && typeof store.load === 'function') store.load()
  } catch {
    // Pinia may not be ready at import time; safe to ignore
  }
}
