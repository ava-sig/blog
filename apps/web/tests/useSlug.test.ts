import { describe, it, expect, vi } from 'vitest'

vi.mock('nuxt/app', () => ({
  useRequestHeaders: () => ({
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'blog.example.com',
  }),
  useRequestURL: () => new URL('https://blog.example.com/'),
}))

import { useSlug } from '../composables/useSlug'

describe('useSlug', () => {
  const { titleToSlug, canonicalSlug, postUrl, xShareUrl } = useSlug()

  it('titleToSlug normalizes diacritics and symbols', () => {
    expect(titleToSlug('Héllö, World! 2024')).toBe('hello-world-2024')
    expect(titleToSlug('  -- A_B  ')).toBe('a-b')
  })

  it('canonicalSlug prefers title slug, then slug, then id', () => {
    expect(canonicalSlug({ title: 'My Title', slug: 'custom' })).toBe('my-title')
    expect(canonicalSlug({ title: '', slug: 'custom' })).toBe('custom')
    expect(canonicalSlug({ id: '123' })).toBe('123')
  })

  it('postUrl builds absolute from the request URL during SSR', () => {
    const p = { title: 'T' }
    expect(postUrl(p)).toBe('https://blog.example.com/p/t')
  })

  it('xShareUrl composes intent with text and url', () => {
    const p = { title: 'Hello World' }
    const url = xShareUrl(p)
    expect(url).toContain('https://x.com/intent/tweet?')
    expect(url).toContain('text=Hello%20World')
    expect(url).toContain('url=https%3A%2F%2Fblog.example.com%2Fp%2Fhello-world')
  })
})
