import { defineStore } from 'pinia'

export interface AuthState {
  token: string
  editing: boolean
}

export const useAuth = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    editing: false,
  }),
  actions: {
    setToken(t: string) {
      this.token = t || ''
      if (process.client) {
        try { localStorage.setItem('auth.token', this.token) } catch {}
      }
    },
    clearToken() {
      this.setToken('')
    },
    toggleEditing() {
      this.editing = !this.editing
      if (process.client) {
        try { localStorage.setItem('auth.editing', String(this.editing)) } catch {}
      }
    },
    setEditing(v: boolean) {
      this.editing = !!v
      if (process.client) {
        try { localStorage.setItem('auth.editing', String(this.editing)) } catch {}
      }
    },
    loadFromStorage() {
      if (!process.client) return
      try {
        const t = localStorage.getItem('auth.token')
        const e = localStorage.getItem('auth.editing')
        if (t) this.token = t
        if (e !== null) this.editing = e === 'true'
      } catch {}
    },
  },
})

// Auto-load from storage on first import (client-side)
if (typeof window !== 'undefined') {
  try {
    const store = (useAuth as any)()
    if (store && typeof store.loadFromStorage === 'function')
      store.loadFromStorage()
  } catch {
    // Pinia may not be initialized yet during SSR/import time; safe to ignore
  }
}
