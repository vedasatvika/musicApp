import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../types'
import { useStore } from '../store'
import { Avatar } from '../components/ui'

export function FriendsScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { friends, incoming, outgoing, searchUsers, respondRequest } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    const id = ++reqId.current
    setSearching(true)
    const t = setTimeout(async () => {
      const found = await searchUsers(q)
      if (id === reqId.current) { setResults(found); setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, searchUsers])

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="logo">Friends</h1>
        <p className="subtle">Find people and compare taste</p>
      </header>

      <div className="search-bar">
        <span className="search-icon">🔎</span>
        <input
          className="search-input" placeholder="Search by @handle or name"
          value={query} onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="none" autoCorrect="off"
        />
        {query && <button className="clear-btn" onClick={() => setQuery('')} aria-label="Clear">✕</button>}
      </div>

      {query.trim() ? (
        <div className="result-list">
          {searching && <div className="state-row"><span className="spinner" /> Searching…</div>}
          {!searching && results.map((p) => (
            <PersonRow key={p.id} person={p} onOpen={() => onOpenProfile(p.id)} />
          ))}
          {!searching && results.length === 0 && <p className="empty">No one found for “{query}”.</p>}
        </div>
      ) : (
        <>
          {incoming.length > 0 && (
            <section className="section">
              <h2 className="section-title">Requests</h2>
              <div className="result-list">
                {incoming.map((req) => (
                  <div key={req.id} className="result-row">
                    <button className="person-main" onClick={() => onOpenProfile(req.from.id)}>
                      <Avatar hue={req.from.avatarHue} name={req.from.name} size={44} />
                      <div className="result-text">
                        <div className="result-title">{req.from.name}</div>
                        <div className="result-sub">@{req.from.handle}</div>
                      </div>
                    </button>
                    <div className="rank-actions">
                      <button className="add-btn" onClick={() => respondRequest(req.id, true)}>Accept</button>
                      <button className="mini-btn" onClick={() => respondRequest(req.id, false)} title="Decline">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="section">
              <h2 className="section-title">Pending</h2>
              <div className="result-list">
                {outgoing.map((p) => (
                  <PersonRow key={p.id} person={p} onOpen={() => onOpenProfile(p.id)} />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <h2 className="section-title">Your friends ({friends.length})</h2>
            <div className="result-list">
              {friends.map((p) => (
                <PersonRow key={p.id} person={p} onOpen={() => onOpenProfile(p.id)} />
              ))}
              {friends.length === 0 && (
                <p className="empty">No friends yet. Search above to add some.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// PersonRow needs relationship + sendRequest; we read them from context directly
// so it can be used anywhere in this screen.
function PersonRow({ person, onOpen }: { person: Profile; onOpen: () => void }) {
  const { relationship, sendRequest } = useStore()
  const status = relationship(person.id)
  return (
    <div className="result-row">
      <button className="person-main" onClick={onOpen}>
        <Avatar hue={person.avatarHue} name={person.name} size={44} />
        <div className="result-text">
          <div className="result-title">{person.name}</div>
          <div className="result-sub">@{person.handle}</div>
        </div>
      </button>
      {status === 'friends' && <span className="status-pill friends">Friends</span>}
      {status === 'outgoing' && <span className="status-pill">Requested</span>}
      {status === 'incoming' && <span className="status-pill">Wants to add you</span>}
      {status === 'none' && (
        <button className="add-btn" onClick={() => sendRequest(person.id)}>Add</button>
      )}
    </div>
  )
}
