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
      // editing is derived from token validity/authorization
      this.editing = this.isAuthorized()
    },
    clearToken() {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          sessionStorage.removeItem('auth.session')
        }
      } catch {}
      this.setToken('')
    },
    // Editing is controlled by token. Toggle becomes a no-op unless authorized.
    toggleEditing() {
      // Ensure editing reflects authorization; ignore manual flips.
      this.editing = this.isAuthorized()
    },
    setEditing(_v: boolean) {
      // Ignore external requests; enforce policy
      this.editing = this.isAuthorized()
    },
    loadFromStorage() {
      if (typeof window === 'undefined') return
      try {
        // Source of truth token is under 'token' per governance
        const t = localStorage.getItem('token') || ''
        this.token = t
        this.editing = this.isAuthorized()
      } catch {}
    },
    // Decode and validate the JWT payload (no signature verification client-side)
    decodePayload(): any | null {
      if (!this.token) return null
      const parts = this.token.split('.')
      if (parts.length < 2) return null
      try {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        // pad base64 to length multiple of 4
        const pad = base64.length % 4
        if (pad) base64 += '='.repeat(4 - pad)
        const json = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8')
        return JSON.parse(json)
      } catch { return null }
    },
    isAuthorized(): boolean {
      const p = this.decodePayload()
      if (!p) return false
      // exp check (seconds since epoch)
      if (typeof p.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000)
        if (p.exp <= nowSec) return false
      }
      // Expected payload policy: role=admin or admin=true or scope contains 'admin' or user==='admin'
      if (p.role === 'admin') return true
      if (p.admin === true) return true
      if (p.user === 'admin') return true
      if (typeof p.scope === 'string' && p.scope.split(/[ ,]/).includes('admin')) return true
      if (Array.isArray(p.scopes) && p.scopes.includes('admin')) return true
      return false
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
