export function useGiphy() {
  function extractGiphyId(rawUrl: string): string | '' {
    if (!rawUrl) return ''
    let raw = String(rawUrl).trim()
    try {
      const u = new URL(raw)
      u.hash = ''
      u.search = ''
      raw = u.toString().replace(/\/$/, '')
    } catch {
      // non-URL string, continue best-effort
    }
    // e.g. https://i.giphy.com/AbCd123.gif (no extra path allowed)
    // Disallow matching i.giphy.com/media/... which should be handled by giphyMedia
    const giphyIDirect = /(https?:\/\/)?i\.giphy\.com\/([A-Za-z0-9]+)(?:\.(?:gif|mp4|webp))?(?:$|[?#])/i
    const giphyMedia = /(https?:\/\/)?(media|i)\.giphy\.com\/media\/([A-Za-z0-9]+)\b/i
    const giphyPageAny = /giphy\.com\/(?:gifs|stickers)\/[^\s]+/i
    const giphyIdDash = /giphy\.com\/(?:gifs|stickers)\/[^\s?#]+-([A-Za-z0-9]+)(?:$|[\/?#])/i
    const giphyIdDirect = /giphy\.com\/(?:gifs|stickers)\/([A-Za-z0-9]+)(?:$|[\/?#])/i
    let id = ''
    const m0 = giphyIDirect.exec(raw)
    if (m0?.[2]) id = m0[2]
    const m1 = !id ? giphyMedia.exec(raw) : null
    if (m1?.[3]) id = m1[3]
    if (!id && giphyPageAny.test(raw)) {
      const mDash = giphyIdDash.exec(raw)
      if (mDash?.[1]) id = mDash[1]
      if (!id) {
        const mDirect = giphyIdDirect.exec(raw)
        if (mDirect?.[1]) id = mDirect[1]
      }
    }
    return id as any
  }

  return { extractGiphyId }
}
