export function useSlug() {
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
    if (typeof window !== 'undefined' && window.location) return `${window.location.origin}/p/${slug}`
    return `/p/${slug}`
  }

  function xShareUrl(p: any): string {
    const text = encodeURIComponent(p?.title || '')
    const url = encodeURIComponent(postUrl(p))
    return `https://x.com/intent/tweet?text=${text}&url=${url}`
  }

  return { titleToSlug, canonicalSlug, postUrl, xShareUrl }
}
