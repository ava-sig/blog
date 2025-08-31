import { useRuntimeConfig } from 'nuxt/app'

export function useContent() {
  const runtime = useRuntimeConfig()
  const apiBase = (runtime.public as any)?.apiBase?.replace(/\/$/, '') || ''

  function escapeHtml(s: string) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
  }

  function renderContent(text: string): string {
    if (!text) return ''
    const escaped = escapeHtml(text)
    const withImages = escaped.replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, url) => {
      let u = String(url).trim()
      u = u.replace(/^<|>$/g, '')
      u = u.replace(/^"+|"+$/g, '')
      u = u.replace(/[)]+$/g, '')
      if (u.startsWith('/uploads/')) u = `${apiBase}${u}`
      return `<img src="${u}" alt="" />\n`
    })
    const withLinks = withImages.replace(/\[([^\]]+)\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, text, url) => {
      let u = String(url).trim()
      u = u.replace(/^<|>$/g, '')
      u = u.replace(/^"+|"+$/g, '')
      u = u.replace(/[)]+$/g, '')
      const t = String(text)
      const safeText = t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<a href="${u}" target="_blank" rel="noopener noreferrer">${safeText}</a>`
    })
    const withBareImages = withLinks.replace(/(https?:\/\/[^\s'\"]+\.(?:png|jpe?g|gif|webp|bmp))(?![^<]*>)/gi, (_m, u) => {
      let url = String(u)
      if (url.startsWith('/uploads/')) url = `${apiBase}${url}`
      return `<img src="${url}" alt="" />`
    })
    return withBareImages
  }

  function firstImageUrl(text: string): string | '' {
    if (!text) return ''
    const m = text.match(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/)
    if (!m) return ''
    let u = String(m[1] || '').trim()
    u = u.replace(/^<|>$/g, '')
    u = u.replace(/^"+|"+$/g, '')
    u = u.replace(/[)]+$/g, '')
    if (!u) return ''
    if (u.startsWith('/uploads/')) return `${apiBase}${u}`
    return u
  }

  return { escapeHtml, renderContent, firstImageUrl }
}
