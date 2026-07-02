import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogItem } from '../types'
import { CATALOG } from '../data/catalog'
import { searchMusic } from '../lib/musicApi'
import type { SearchScope } from '../lib/musicApi'
import { useStore } from '../store'
import { Cover, ScoreBadge } from '../components/ui'

export function SearchScreen({ onRank }: { onRank: (item: CatalogItem) => void }) {
  const { myRankings } = useStore()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  // Bumps on every keystroke/scope change so stale responses are ignored.
  const reqId = useRef(0)

  const rankedById = useMemo(
    () => new Map(myRankings.map((r) => [r.itemId, r])),
    [myRankings],
  )

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setStatus('idle')
      return
    }
    const id = ++reqId.current
    setStatus('loading')
    const t = setTimeout(() => {
      searchMusic(q, scope)
        .then((items) => {
          if (id !== reqId.current) return // a newer query superseded this one
          setResults(items)
          setStatus('idle')
        })
        .catch(() => {
          if (id !== reqId.current) return
          setStatus('error')
        })
    }, 300) // debounce
    return () => clearTimeout(t)
  }, [query, scope])

  // Filter the built-in "popular" suggestions shown before you type.
  const suggestions = useMemo(
    () => (scope === 'all' ? CATALOG : CATALOG.filter((c) => c.type === scope)),
    [scope],
  )

  const showingSuggestions = query.trim() === ''
  const list = showingSuggestions ? suggestions : results

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="logo">Rank something</h1>
        <p className="subtle">Search any song or album, then rate it</p>
      </header>

      <div className="search-bar">
        <span className="search-icon">🔎</span>
        <input
          className="search-input"
          placeholder="Try “One Dance”, “Drake”, “SOS”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {query && (
          <button className="clear-btn" onClick={() => setQuery('')} aria-label="Clear">✕</button>
        )}
      </div>

      <div className="seg">
        {(['all', 'song', 'album'] as SearchScope[]).map((f) => (
          <button
            key={f}
            className={`seg-btn${scope === f ? ' active' : ''}`}
            onClick={() => setScope(f)}
          >
            {f === 'all' ? 'All' : f === 'song' ? 'Songs' : 'Albums'}
          </button>
        ))}
      </div>

      {showingSuggestions && <p className="list-label">Popular right now</p>}

      {status === 'loading' && (
        <div className="state-row"><span className="spinner" /> Searching the catalog…</div>
      )}
      {status === 'error' && (
        <p className="empty">Couldn't reach the music service. Check your connection and try again.</p>
      )}

      {status !== 'loading' && (
        <div className="result-list">
          {list.map((item) => {
            const ranked = rankedById.get(item.id)
            return (
              <button key={item.id} className="result-row" onClick={() => onRank(item)}>
                <Cover item={item} size={48} />
                <div className="result-text">
                  <div className="result-title">{item.title}</div>
                  <div className="result-sub">
                    {item.artist} · {item.type === 'song' ? 'Song' : 'Album'}
                    {item.year ? ` · ${item.year}` : ''}
                  </div>
                </div>
                {ranked ? (
                  <ScoreBadge score={ranked.score} />
                ) : (
                  <span className="add-btn">Rank</span>
                )}
              </button>
            )
          })}
          {!showingSuggestions && list.length === 0 && status === 'idle' && (
            <p className="empty">No matches for “{query}”. Try a different spelling.</p>
          )}
        </div>
      )}
    </div>
  )
}
