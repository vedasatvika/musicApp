import { useMemo, useState } from 'react'
import type { CatalogItem, Ranking, Tag } from '../types'
import { ALL_TAGS } from '../types'
import { getItem } from '../data/catalog'
import { useStore } from '../store'
import { compatibility } from '../lib/compatibility'
import { scoreColor, sentimentMeta, sortRankings } from '../lib/ranking'
import { Avatar, Cover, ScoreBadge, TagChip } from '../components/ui'

export function ProfileScreen({
  userId,
  onRank,
  onBack,
}: {
  userId: string
  onRank: (item: CatalogItem) => void
  onBack?: () => void
}) {
  const { currentUser, getUser, removeRanking } = useStore()
  const user = getUser(userId)
  const [tagFilter, setTagFilter] = useState<Tag | null>(null)

  const sorted = useMemo(() => (user ? sortRankings(user.rankings) : []), [user])
  const isSelf = user?.id === currentUser.id

  if (!user) return <div className="screen"><p className="empty">User not found.</p></div>

  const compat = isSelf ? null : compatibility(currentUser, user)
  const top10 = sorted.slice(0, 10)
  const visible = tagFilter ? sorted.filter((r) => r.tags.includes(tagFilter)) : sorted

  // Tags this user has actually used, for the filter row.
  const usedTags = ALL_TAGS.filter((t) => user.rankings.some((r) => r.tags.includes(t)))

  return (
    <div className="screen">
      <header className="profile-header">
        {onBack && <button className="ghost-btn back" onClick={onBack}>‹ Feed</button>}
        <Avatar hue={user.avatarHue} name={user.name} size={76} />
        <h1 className="profile-name">{user.name}</h1>
        <p className="profile-handle">@{user.handle}</p>

        <div className="stat-row">
          <div className="stat">
            <span className="stat-num">{user.rankings.length}</span>
            <span className="stat-label">ranked</span>
          </div>
          {compat ? (
            <div className="stat compat" style={{ borderColor: scoreColor(compat.percent / 10) }}>
              <span className="stat-num" style={{ color: scoreColor(compat.percent / 10) }}>
                {compat.percent}%
              </span>
              <span className="stat-label">match</span>
            </div>
          ) : (
            <div className="stat">
              <span className="stat-num">{new Set(user.rankings.flatMap((r) => r.tags)).size}</span>
              <span className="stat-label">tags used</span>
            </div>
          )}
          <div className="stat">
            <span className="stat-num">
              {user.rankings.filter((r) => r.sentiment === 'loved').length}
            </span>
            <span className="stat-label">loved</span>
          </div>
        </div>

        {compat && compat.sharedCount > 0 && (
          <p className="compat-note">
            You've both ranked {compat.sharedCount} of the same
            {compat.commonFavorites.length > 0 && (
              <> · {compat.commonFavorites.length} shared favorite{compat.commonFavorites.length > 1 ? 's' : ''}</>
            )}
          </p>
        )}
      </header>

      <section className="section">
        <h2 className="section-title">Top 10</h2>
        <div className="top10">
          {top10.map((r, i) => (
            <Top10Row key={r.itemId} rank={i + 1} ranking={r} />
          ))}
          {top10.length === 0 && <p className="empty">Nothing ranked yet.</p>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">All rankings</h2>
        </div>
        {usedTags.length > 0 && (
          <div className="tag-wrap filter-row">
            <button
              className={`tag-chip${tagFilter === null ? ' active' : ''}`}
              onClick={() => setTagFilter(null)}
            >
              all
            </button>
            {usedTags.map((t) => (
              <TagChip key={t} tag={t} active={tagFilter === t} onClick={() => setTagFilter(t)} />
            ))}
          </div>
        )}
        <div className="rank-list">
          {visible.map((r) => (
            <RankRow
              key={r.itemId}
              ranking={r}
              onRank={isSelf ? onRank : undefined}
              onRemove={isSelf ? () => removeRanking(r.itemId) : undefined}
            />
          ))}
          {visible.length === 0 && <p className="empty">No rankings with #{tagFilter}.</p>}
        </div>
      </section>
    </div>
  )
}

function Top10Row({ rank, ranking }: { rank: number; ranking: Ranking }) {
  const item = getItem(ranking.itemId)
  if (!item) return null
  return (
    <div className="top10-row">
      <span className="top10-rank">{rank}</span>
      <Cover item={item} size={40} />
      <div className="top10-text">
        <div className="top10-title">{item.title}</div>
        <div className="top10-sub">{item.artist}</div>
      </div>
      <ScoreBadge score={ranking.score} />
    </div>
  )
}

function RankRow({
  ranking,
  onRank,
  onRemove,
}: {
  ranking: Ranking
  onRank?: (item: CatalogItem) => void
  onRemove?: () => void
}) {
  const item = getItem(ranking.itemId)
  if (!item) return null
  const meta = sentimentMeta(ranking.sentiment)
  return (
    <div className="rank-row" style={{ borderLeftColor: meta.color }}>
      <Cover item={item} size={44} />
      <div className="rank-text">
        <div className="rank-title">{item.title}</div>
        <div className="rank-sub">{item.artist} · {item.type}</div>
        {ranking.tags.length > 0 && (
          <div className="rank-tags">{ranking.tags.map((t) => `#${t}`).join(' ')}</div>
        )}
      </div>
      <div className="rank-actions">
        <ScoreBadge score={ranking.score} />
        {onRank && (
          <button className="mini-btn" onClick={() => onRank(item)} title="Re-rank">↻</button>
        )}
        {onRemove && (
          <button className="mini-btn danger" onClick={onRemove} title="Remove">✕</button>
        )}
      </div>
    </div>
  )
}
