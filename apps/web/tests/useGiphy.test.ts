import { describe, it, expect } from 'vitest'
import { useGiphy } from '../composables/useGiphy'

describe('useGiphy', () => {
  const { extractGiphyId } = useGiphy()

  it('extracts from media.giphy.com direct path', () => {
    expect(extractGiphyId('https://media.giphy.com/media/AbCd123/giphy.gif')).toBe('AbCd123')
    expect(extractGiphyId('https://media.giphy.com/media/AbCd123/giphy.mp4')).toBe('AbCd123')
  })

  it('extracts from i.giphy.com', () => {
    expect(extractGiphyId('https://i.giphy.com/AbCd123.gif')).toBe('AbCd123')
    expect(extractGiphyId('https://i.giphy.com/media/AbCd123/200w.gif')).toBe('AbCd123')
  })

  it('extracts from giphy.com/gifs/slug-style', () => {
    expect(extractGiphyId('https://giphy.com/gifs/funny-cat-AbCd123')).toBe('AbCd123')
    expect(extractGiphyId('https://giphy.com/gifs/AbCd123')).toBe('AbCd123')
  })

  it('returns empty for non-giphy links', () => {
    expect(extractGiphyId('https://example.com/a.gif')).toBe('')
  })
})
