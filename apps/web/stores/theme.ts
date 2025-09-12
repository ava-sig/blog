import { defineStore } from 'pinia'

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
      try {
        const t = (localStorage.getItem('ui.theme') as Theme) || 'light'
        this.theme = (t === 'dark' ? 'dark' : 'light')
      } catch { this.theme = 'light' }
      this.applyThemeClass()
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