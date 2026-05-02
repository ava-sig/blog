import { useRequestHeaders, useRequestURL } from 'nuxt/app'

export function useSlug() {
  function currentOrigin(): string {
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
    try {
      const headers = useRequestHeaders(['x-forwarded-proto', 'x-forwarded-host', 'host'])
      const proto = String(headers['x-forwarded-proto'] || '').split(',')[0]?.trim()
      const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0]?.trim()
      if (proto && host) return `${proto}://${host}`
      const reqUrl = useRequestURL()
      if (host) {
        const fallbackProto = String(reqUrl?.protocol || '').replace(/:$/, '') || 'https'
        return `${fallbackProto}://${host}`
      }
      if (reqUrl?.origin && reqUrl.origin !== 'null') return reqUrl.origin
    } catch {}
    return ''
  }

  function titleToSlug(input: string): string {
    return String(input || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function canonicalSlug(p: any): string {
    const t = titleToSlug(p?.title || '')
    return t || p?.slug || p?.id || ''
  }

  function postUrl(p: any): string {
    const slug = canonicalSlug(p)
    if (!slug) return ''
    const origin = currentOrigin()
    if (origin) return `${origin}/p/${slug}`
    return `/p/${slug}`
  }

  function xShareUrl(p: any): string {
    const text = encodeURIComponent(p?.title || '')
    const url = encodeURIComponent(postUrl(p))
    return `https://x.com/intent/tweet?text=${text}&url=${url}`
  }

  return { titleToSlug, canonicalSlug, postUrl, xShareUrl }
}
