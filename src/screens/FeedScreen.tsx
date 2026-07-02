import { useStore } from '../store'
import { sentimentMeta } from '../lib/ranking'
import { timeAgo } from '../lib/format'
import { Avatar, Cover, ScoreBadge, TagChip } from '../components/ui'
import type { Ranking, User } from '../types'

interface FeedEntry {
  user: User
  ranking: Ranking
}

export function FeedScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { following } = useStore()

  const entries: FeedEntry[] = following
    .flatMap((user) => user.rankings.map((ranking) => ({ user, ranking })))
    .sort((a, b) => new Date(b.ranking.rankedAt).getTime() - new Date(a.ranking.rankedAt).getTime())
    .slice(0, 30)

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="logo">Tempo</h1>
        <p className="subtle">What your friends are ranking</p>
      </header>
      <div className="feed">
        {entries.map(({ user, ranking }) => (
          <FeedCard
            key={`${user.id}-${ranking.itemId}`}
            user={user}
            ranking={ranking}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </div>
  )
}

function FeedCard({
  user,
  ranking,
  onOpenProfile,
}: {
  user: User
  ranking: Ranking
  onOpenProfile: (id: string) => void
}) {
  const { getItem } = useStore()
  const item = getItem(ranking.itemId)
  if (!item) return null
  const meta = sentimentMeta(ranking.sentiment)
  return (
    <article className="feed-card">
      <div className="feed-card-top">
        <button className="feed-user" onClick={() => onOpenProfile(user.id)}>
          <Avatar hue={user.avatarHue} name={user.name} size={34} />
          <div className="feed-user-text">
            <span className="feed-name">{user.name}</span>
            <span className="feed-action">
              ranked a {item.type} · {timeAgo(ranking.rankedAt)}
            </span>
          </div>
        </button>
        <span className="pill sm" style={{ background: meta.color }}>{meta.emoji} {meta.label}</span>
      </div>

      <div className="feed-item">
        <Cover item={item} size={56} />
        <div className="feed-item-text">
          <div className="feed-item-title">{item.title}</div>
          <div className="feed-item-sub">{item.artist} · {item.year}</div>
        </div>
        <ScoreBadge score={ranking.score} size="lg" />
      </div>

      {ranking.note && <p className="feed-note">“{ranking.note}”</p>}

      {ranking.tags.length > 0 && (
        <div className="tag-wrap">
          {ranking.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
    </article>
  )
}
