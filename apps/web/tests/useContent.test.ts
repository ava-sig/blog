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
    expect(html).toContain('<img src="https://api.example.com/uploads/img.png" alt="alt">')
  })

  it('renderContent converts links with safe text', () => {
    const md = '[Click](https://example.com)'
    const html = content.renderContent(md)
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Click</a>')
  })

  it('renderContent supports markdown structure beyond links and images', () => {
    const md = '# Hello\n\n- one\n- two\n\n**bold**'
    const html = content.renderContent(md)
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renderContent leaves bare URLs as text instead of turning them into images', () => {
    const md = 'https://example.com/a.jpg'
    const html = content.renderContent(md)
    expect(html).not.toContain('<img')
    expect(html).toContain('https://example.com/a.jpg')
  })

  it('renderContent turns markdown video markers into a youtube embed', () => {
    const md = '![video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)'
    const html = content.renderContent(md)
    expect(html).toContain('class="video-embed"')
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(html).toContain('<iframe')
  })

  it('splitPreview truncates feed content at a standalone separator', () => {
    const md = '# Hello\n\nLead text\n\n---\n\n## Hidden\nMore'
    expect(content.splitPreview(md)).toEqual({
      preview: '# Hello\n\nLead text',
      truncated: true,
    })
  })

  it('splitPreview ignores separators when there is no lead content', () => {
    const md = '---\n\n## Full Post'
    expect(content.splitPreview(md)).toEqual({
      preview: md,
      truncated: false,
    })
  })

  it('firstImageUrl finds first markdown image and prefixes /uploads', () => {
    const md = 'text ![x](/uploads/a.jpg) more ![y](https://x/y.jpg)'
    expect(content.firstImageUrl(md)).toBe('https://api.example.com/uploads/a.jpg')
  })

  it('firstImageUrl ignores markdown video embeds', () => {
    const md = '![video](https://youtu.be/dQw4w9WgXcQ)\n\n![x](/uploads/a.jpg)'
    expect(content.firstImageUrl(md)).toBe('https://api.example.com/uploads/a.jpg')
  })

  it('firstImageUrl returns empty when none', () => {
    expect(content.firstImageUrl('no images here')).toBe('')
  })
})
