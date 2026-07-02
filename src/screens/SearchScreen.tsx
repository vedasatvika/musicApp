import { useMemo, useState } from 'react'
import type { CatalogItem, MediaType } from '../types'
import { CATALOG } from '../data/catalog'
import { useStore } from '../store'
import { Cover, ScoreBadge } from '../components/ui'

type Filter = 'all' | MediaType

export function SearchScreen({ onRank }: { onRank: (item: CatalogItem) => void }) {
  const { currentUser } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const rankedById = useMemo(
    () => new Map(currentUser.rankings.map((r) => [r.itemId, r])),
    [currentUser.rankings],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((c) => {
      if (filter !== 'all' && c.type !== filter) return false
      if (!q) return true
      return c.title.toLowerCase().includes(q) || c.artist.toLowerCase().includes(q)
    })
  }, [query, filter])

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="logo">Rank something</h1>
        <p className="subtle">Search a song or album, then rate it</p>
      </header>

      <div className="search-bar">
        <span className="search-icon">🔎</span>
        <input
          className="search-input"
          placeholder="Songs, albums, artists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="seg">
        {(['all', 'song', 'album'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`seg-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'song' ? 'Songs' : 'Albums'}
          </button>
        ))}
      </div>

      <div className="result-list">
        {results.map((item) => {
          const ranked = rankedById.get(item.id)
          return (
            <button key={item.id} className="result-row" onClick={() => onRank(item)}>
              <Cover item={item} size={48} />
              <div className="result-text">
                <div className="result-title">{item.title}</div>
                <div className="result-sub">
                  {item.artist} · {item.type === 'song' ? 'Song' : 'Album'} · {item.year}
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
        {results.length === 0 && <p className="empty">No matches. Try another search.</p>}
      </div>
    </div>
  )
}
