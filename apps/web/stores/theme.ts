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
    setTheme(next: Theme) {
      this.theme = next
      this.applyThemeClass()
      this.persist()
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
    load() {
      if (typeof window === 'undefined') return
      (async () => {
        // Local preference takes precedence
        try {
          const t = (localStorage.getItem('ui.theme') as Theme) || ''
          if (t === 'dark' || t === 'light') {
            this.theme = t
            this.applyThemeClass()
            return
          }
        } catch {}

        // Fallback to server default if available
        try {
          const cfg = useRuntimeConfig()
          const base = (cfg.public as any)?.apiBase || ''
          const url = `${String(base).replace(/\/$/, '')}/api/settings`
          const r = await fetch(url)
          if (r.ok) {
            const data = await r.json()
            const dt = data?.defaultTheme
            if (dt === 'dark' || dt === 'light') {
              this.theme = dt
              this.applyThemeClass()
              return
            }
          }
        } catch {}

        // Final fallback
        this.theme = 'light'
        this.applyThemeClass()
      })()
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