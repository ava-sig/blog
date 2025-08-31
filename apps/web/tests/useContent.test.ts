import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { apiBase: 'https://api.example.com' } }),
}))

import { useContent } from '../composables/useContent'

describe('useContent', () => {
  let content: ReturnType<typeof useContent>

  beforeEach(() => {
    content = useContent()
  })

  it('escapeHtml escapes tags', () => {
    expect(content.escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
  })

  it('renderContent converts markdown images and prefixes /uploads', () => {
    const md = '![alt](/uploads/img.png)'
    const html = content.renderContent(md)
    expect(html).toContain('<img src="https://api.example.com/uploads/img.png" alt="" />')
  })

  it('renderContent converts links with safe text', () => {
    const md = '[Click](https://example.com)'
    const html = content.renderContent(md)
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Click</a>')
  })

  it('renderContent converts bare image URLs', () => {
    const md = 'https://example.com/a.jpg'
    const html = content.renderContent(md)
    expect(html).toContain('<img src="https://example.com/a.jpg" alt="" />')
  })

  it('firstImageUrl finds first markdown image and prefixes /uploads', () => {
    const md = 'text ![x](/uploads/a.jpg) more ![y](https://x/y.jpg)'
    expect(content.firstImageUrl(md)).toBe('https://api.example.com/uploads/a.jpg')
  })

  it('firstImageUrl returns empty when none', () => {
    expect(content.firstImageUrl('no images here')).toBe('')
  })
})
