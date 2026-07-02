import type { CatalogItem, MediaType } from '../types'

/**
 * Live music search backed by the public iTunes Search API.
 *
 * The app runs entirely in the browser with no backend, so we load results via
 * JSONP (the iTunes API supports a `callback` param). That sidesteps CORS and
 * needs no API key — giving access to essentially the entire commercial music
 * catalog (songs + albums) with real cover art.
 */

const ENDPOINT = 'https://itunes.apple.com/search'

let jsonpSeq = 0

function jsonp<T = unknown>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__tempo_itunes_cb_${Date.now()}_${jsonpSeq++}`
    const script = document.createElement('script')
    let done = false

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      script.remove()
      clearTimeout(timer)
    }

    ;(window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      if (done) return
      done = true
      cleanup()
      resolve(data)
    }

    const timer = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('Music search timed out'))
    }, timeoutMs)

    script.onerror = () => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('Could not reach the music service'))
    }

    const sep = url.includes('?') ? '&' : '?'
    script.src = `${url}${sep}callback=${cbName}`
    document.body.appendChild(script)
  })
}

// --- Deterministic fallback art (used until/if the real cover fails) ---

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const SONG_EMOJI = ['🎵', '🎧', '🎤', '🎶', '🔊', '💫', '🌊', '🔥', '✨', '🌙']
const ALBUM_EMOJI = ['💿', '📀', '🎼', '🪩', '🌀', '🎹', '🎸', '🌅', '🎷', '🕊️']

function fallbackArt(seed: string, type: MediaType): { hue: number; emoji: string } {
  const h = hashString(seed)
  const set = type === 'song' ? SONG_EMOJI : ALBUM_EMOJI
  return { hue: h % 360, emoji: set[h % set.length] }
}

// iTunes returns a 100px artwork url; bump it to a crisper size.
function upscaleArtwork(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/300x300bb.$1')
}

interface ItunesResult {
  wrapperType?: string
  kind?: string
  trackId?: number
  collectionId?: number
  trackName?: string
  collectionName?: string
  artistName?: string
  releaseDate?: string
  artworkUrl100?: string
}

function mapSong(r: ItunesResult): CatalogItem | null {
  if (!r.trackId || !r.trackName || !r.artistName) return null
  const seed = `${r.trackName}-${r.artistName}`
  const { hue, emoji } = fallbackArt(seed, 'song')
  return {
    id: `it-song-${r.trackId}`,
    type: 'song',
    title: r.trackName,
    artist: r.artistName,
    year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : 0,
    hue,
    emoji,
    artworkUrl: upscaleArtwork(r.artworkUrl100),
  }
}

function mapAlbum(r: ItunesResult): CatalogItem | null {
  if (!r.collectionId || !r.collectionName || !r.artistName) return null
  const seed = `${r.collectionName}-${r.artistName}`
  const { hue, emoji } = fallbackArt(seed, 'album')
  return {
    id: `it-album-${r.collectionId}`,
    type: 'album',
    title: r.collectionName,
    artist: r.artistName,
    year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : 0,
    hue,
    emoji,
    artworkUrl: upscaleArtwork(r.artworkUrl100),
  }
}

async function searchEntity(term: string, entity: 'song' | 'album'): Promise<CatalogItem[]> {
  const url =
    `${ENDPOINT}?media=music&entity=${entity}&limit=25&term=${encodeURIComponent(term)}`
  const data = await jsonp<{ results?: ItunesResult[] }>(url)
  const results = data.results ?? []
  const mapped = results.map((r) => (entity === 'song' ? mapSong(r) : mapAlbum(r)))
  return mapped.filter((x): x is CatalogItem => x !== null)
}

export type SearchScope = 'all' | MediaType

/** Search the live catalog. For "all" we merge song + album results. */
export async function searchMusic(term: string, scope: SearchScope): Promise<CatalogItem[]> {
  const q = term.trim()
  if (!q) return []

  if (scope === 'song') return searchEntity(q, 'song')
  if (scope === 'album') return searchEntity(q, 'album')

  const [songs, albums] = await Promise.all([
    searchEntity(q, 'song').catch(() => [] as CatalogItem[]),
    searchEntity(q, 'album').catch(() => [] as CatalogItem[]),
  ])
  // Interleave a bit so the list isn't all songs then all albums.
  const merged: CatalogItem[] = []
  const max = Math.max(songs.length, albums.length)
  for (let i = 0; i < max; i++) {
    if (songs[i]) merged.push(songs[i])
    if (albums[i]) merged.push(albums[i])
  }
  return merged
}
