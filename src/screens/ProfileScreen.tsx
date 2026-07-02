import { useEffect, useMemo, useState } from 'react'
import type { CatalogItem, Ranking, User } from '../types'
import { ALL_TAGS } from '../types'
import type { Tag } from '../types'
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
  onOpenProfile?: (id: string) => void
  onBack?: () => void
}) {
  const { profile, myRankings, getItem, removeRanking, signOut, getProfileData, friends } = useStore()
  const isSelf = userId === profile?.id

  const [other, setOther] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [tagFilter, setTagFilter] = useState<Tag | null>(null)

  useEffect(() => {
    if (isSelf) { setOther(null); return }
    let alive = true
    setLoading(true)
    getProfileData(userId).then((u) => {
      if (alive) { setOther(u); setLoading(false) }
    })
    return () => { alive = false }
  }, [userId, isSelf, getProfileData])

  const me: User | null = useMemo(
    () => (profile ? { ...profile, rankings: myRankings } : null),
    [profile, myRankings],
  )
  const viewed: User | null = isSelf ? me : other

  const sorted = useMemo(() => (viewed ? sortRankings(viewed.rankings) : []), [viewed])

  if (loading && !viewed) {
    return <div className="screen"><div className="state-row"><span className="spinner" /> Loading…</div></div>
  }
  if (!viewed) return <div className="screen"><p className="empty">User not found.</p></div>

  const compat = !isSelf && me ? compatibility(me, viewed) : null
  const top10 = sorted.slice(0, 10)
  const visible = tagFilter ? sorted.filter((r) => r.tags.includes(tagFilter)) : sorted
  const usedTags = ALL_TAGS.filter((t) => viewed.rankings.some((r) => r.tags.includes(t)))

  return (
    <div className="screen">
      <header className="profile-header">
        {onBack && <button className="ghost-btn back" onClick={onBack}>‹ Back</button>}
        {isSelf && <button className="ghost-btn signout" onClick={signOut}>Log out</button>}
        <Avatar hue={viewed.avatarHue} name={viewed.name} size={76} />
        <h1 className="profile-name">{viewed.name}</h1>
        <p className="profile-handle">@{viewed.handle}</p>

        {!isSelf && <FriendButton userId={viewed.id} />}

        <div className="stat-row">
          <div className="stat">
            <span className="stat-num">{viewed.rankings.length}</span>
            <span className="stat-label">ranked</span>
          </div>
          {compat ? (
            <div className="stat compat" style={{ borderColor: scoreColor(compat.percent / 10) }}>
              <span className="stat-num" style={{ color: scoreColor(compat.percent / 10) }}>{compat.percent}%</span>
              <span className="stat-label">match</span>
            </div>
          ) : (
            <div className="stat">
              <span className="stat-num">{friends.length}</span>
              <span className="stat-label">friends</span>
            </div>
          )}
          <div className="stat">
            <span className="stat-num">{viewed.rankings.filter((r) => r.sentiment === 'loved').length}</span>
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
          {top10.map((r, i) => <Top10Row key={r.itemId} rank={i + 1} ranking={r} getItem={getItem} />)}
          {top10.length === 0 && <p className="empty">Nothing ranked yet.</p>}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">All rankings</h2>
        {usedTags.length > 0 && (
          <div className="tag-wrap filter-row">
            <button className={`tag-chip${tagFilter === null ? ' active' : ''}`} onClick={() => setTagFilter(null)}>all</button>
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
              getItem={getItem}
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

function FriendButton({ userId }: { userId: string }) {
  const { relationship, sendRequest, removeFriend, respondRequest, incoming } = useStore()
  const status = relationship(userId)

  if (status === 'friends') {
    return <button className="profile-action ghost" onClick={() => removeFriend(userId)}>Friends ✓ · Remove</button>
  }
  if (status === 'outgoing') {
    return <button className="profile-action ghost" onClick={() => removeFriend(userId)}>Requested · Cancel</button>
  }
  if (status === 'incoming') {
    const req = incoming.find((r) => r.from.id === userId)
    return (
      <div className="action-pair">
        <button className="profile-action" onClick={() => req && respondRequest(req.id, true)}>Accept request</button>
        <button className="profile-action ghost" onClick={() => req && respondRequest(req.id, false)}>Decline</button>
      </div>
    )
  }
  return <button className="profile-action" onClick={() => sendRequest(userId)}>+ Add friend</button>
}

function Top10Row({
  rank, ranking, getItem,
}: { rank: number; ranking: Ranking; getItem: (id: string) => CatalogItem | undefined }) {
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
  ranking, getItem, onRank, onRemove,
}: {
  ranking: Ranking
  getItem: (id: string) => CatalogItem | undefined
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
        {onRank && <button className="mini-btn" onClick={() => onRank(item)} title="Re-rank">↻</button>}
        {onRemove && <button className="mini-btn danger" onClick={onRemove} title="Remove">✕</button>}
      </div>
    </div>
  )
}
