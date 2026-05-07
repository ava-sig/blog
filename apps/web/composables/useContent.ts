import MarkdownIt from 'markdown-it'
import { useRuntimeConfig } from 'nuxt/app'

type MdTokenLike = {
  type?: string
  content?: string
  children?: MdTokenLike[]
  attrGet(name: string): string | null
  attrSet(name: string, value: string): void
}

export function useContent() {
  const runtime = useRuntimeConfig()
  const apiBase = (runtime.public as any)?.apiBase?.replace(/\/$/, '') || ''
  const previewMarker = /^\s*---\s*$/m

  function escapeHtml(s: string) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
  }

  function normalizeMediaUrl(url: string): string {
    const value = String(url || '').trim()
      .replace(/^<|>$/g, '')
      .replace(/^"+|"+$/g, '')
      .replace(/[)]+$/g, '')
    if (value.startsWith('/uploads/')) return `${apiBase}${value}`
    return value
  }

  function getYouTubeEmbedUrl(url: string): string {
    try {
      const raw = String(url || '').trim()
      if (!raw) return ''
      const parsed = new URL(raw)
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
      let videoId = ''

      if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || ''
      } else if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') {
          videoId = parsed.searchParams.get('v') || ''
        } else {
          const parts = parsed.pathname.split('/').filter(Boolean)
          if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
            videoId = parts[1] || ''
          }
        }
      }

      if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return ''
      return `https://www.youtube-nocookie.com/embed/${videoId}`
    } catch {
      return ''
    }
  }

  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: false,
  })

  const defaultImageRule = md.renderer.rules.image
  md.renderer.rules.image = (
    tokens: MdTokenLike[],
    idx: number,
    options: unknown,
    env: unknown,
    self: { renderToken(tokens: MdTokenLike[], idx: number, options: unknown): string }
  ) => {
    const token = tokens[idx]
    const src = normalizeMediaUrl(token.attrGet('src') || '')
    const alt = String(token.content || '').trim().toLowerCase()
    const embedUrl = alt === 'video' ? getYouTubeEmbedUrl(src) : ''
    if (embedUrl) {
      const safeUrl = escapeHtml(embedUrl)
      return `<div class="video-embed"><iframe src="${safeUrl}" title="YouTube video player" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    }
    token.attrSet('src', src)
    return defaultImageRule ? defaultImageRule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }

  const defaultLinkOpenRule = md.renderer.rules.link_open
  md.renderer.rules.link_open = (
    tokens: MdTokenLike[],
    idx: number,
    options: unknown,
    env: unknown,
    self: { renderToken(tokens: MdTokenLike[], idx: number, options: unknown): string }
  ) => {
    const token = tokens[idx]
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    return defaultLinkOpenRule ? defaultLinkOpenRule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }

  function renderContent(text: string): string {
    if (!text) return ''
    return md.render(text)
  }

  function splitPreview(text: string): { preview: string; truncated: boolean } {
    const input = String(text || '')
    const match = input.match(previewMarker)
    if (!match || typeof match.index !== 'number') {
      return { preview: input, truncated: false }
    }
    const preview = input.slice(0, match.index).trimEnd()
    if (!preview.trim()) {
      return { preview: input, truncated: false }
    }
    return { preview, truncated: true }
  }

  function firstImageUrl(text: string): string | '' {
    if (!text) return ''
    const tokens = md.parse(text, {}) as MdTokenLike[]
    for (const token of tokens) {
      if (token.type === 'inline' && Array.isArray(token.children)) {
        for (const child of token.children) {
          if (child.type === 'image') {
            const src = normalizeMediaUrl(child.attrGet('src') || '')
            const alt = String(child.content || '').trim().toLowerCase()
            if (alt === 'video' && getYouTubeEmbedUrl(src)) continue
            if (src) return src
          }
        }
      }
    }
    return ''
  }

  return { escapeHtml, renderContent, splitPreview, firstImageUrl }
}
