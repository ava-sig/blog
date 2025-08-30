import { useRuntimeConfig } from 'nuxt/app'

export function useApi() {
  const config = useRuntimeConfig()
  const base = (config.public as any)?.apiBase || ''

  async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${base.replace(/\/$/, '')}/api${path}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      if (typeof window !== 'undefined') {
        const sessionOk = sessionStorage.getItem('auth.session') === '1'
        const token = localStorage.getItem('token') || ''
        if (sessionOk && token) headers['Authorization'] = `Bearer ${token}`
      }
    } catch {}
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const msg = text || `${res.status} ${res.statusText}`
      throw new Error(`${method} ${url} -> ${msg}`)
    }
    // Handle empty/204 or non-JSON responses gracefully
    if (res.status === 204) return undefined as unknown as T
    const ct = res.headers.get('content-type') || ''
    if (/json/i.test(ct)) return res.json() as Promise<T>
    return undefined as unknown as T
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: any) => request<T>('POST', path, body),
    put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
    del: <T>(path: string) => request<T>('DELETE', path),
    async upload(path: string, field: string, file: File): Promise<{ ok: boolean; url: string }> {
      // Build base URL from runtime config (same as request()) and attach Authorization.
      const config = useRuntimeConfig()
      const base = (config.public as any)?.apiBase || ''
      let token = ''
      if (typeof window !== 'undefined') {
        try {
          const sessionOk = sessionStorage.getItem('auth.session') === '1'
          const t = localStorage.getItem('token')
          if (sessionOk && t) token = t
        } catch {}
      }
      const url = `${String(base).replace(/\/$/, '')}${path}`
      const fd = new FormData()
      fd.append(field, file)
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(url, { method: 'POST', headers, body: fd })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`UPLOAD ${url} -> ${text || res.status}`)
      }
      return res.json()
    },
  }
}
