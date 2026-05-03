import MarkdownIt from 'markdown-it'
import { useRuntimeConfig } from 'nuxt/app'

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

  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: false,
  })

  const defaultImageRule = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = normalizeMediaUrl(token.attrGet('src') || '')
    token.attrSet('src', src)
    return defaultImageRule ? defaultImageRule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }

  const defaultLinkOpenRule = md.renderer.rules.link_open
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
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
    const tokens = md.parse(text, {})
    for (const token of tokens) {
      if (token.type === 'inline' && Array.isArray(token.children)) {
        for (const child of token.children) {
          if (child.type === 'image') {
            const src = normalizeMediaUrl(child.attrGet('src') || '')
            if (src) return src
          }
        }
      }
    }
    return ''
  }

  return { escapeHtml, renderContent, splitPreview, firstImageUrl }
}
