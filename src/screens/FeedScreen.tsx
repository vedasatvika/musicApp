import { useStore } from '../store'
import type { FeedEntry } from '../store'
import { sentimentMeta } from '../lib/ranking'
import { timeAgo } from '../lib/format'
import { Avatar, Cover, ScoreBadge, TagChip } from '../components/ui'

export function FeedScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { feed, friends } = useStore()

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="logo">Tempo</h1>
        <p className="subtle">What your friends are ranking</p>
      </header>

      {feed.length === 0 ? (
        <div className="empty-feed">
          <div className="empty-emoji">🎧</div>
          <p className="empty-title">
            {friends.length === 0 ? 'Add some friends to fill your feed' : 'No rankings from friends yet'}
          </p>
          <p className="empty">
            {friends.length === 0
              ? 'Head to the Friends tab to find people, then their rankings show up here.'
              : 'When your friends rank something, it lands here.'}
          </p>
        </div>
      ) : (
        <div className="feed">
          {feed.map((entry) => (
            <FeedCard key={`${entry.profile.id}-${entry.ranking.itemId}`} entry={entry} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedCard({ entry, onOpenProfile }: { entry: FeedEntry; onOpenProfile: (id: string) => void }) {
  const { profile: user, ranking, item } = entry
  const meta = sentimentMeta(ranking.sentiment)
  return (
    <article className="feed-card">
      <div className="feed-card-top">
        <button className="feed-user" onClick={() => onOpenProfile(user.id)}>
          <Avatar hue={user.avatarHue} name={user.name} size={34} />
          <div className="feed-user-text">
            <span className="feed-name">{user.name}</span>
            <span className="feed-action">ranked a {item.type} · {timeAgo(ranking.rankedAt)}</span>
          </div>
        </button>
        <span className="pill sm" style={{ background: meta.color }}>{meta.emoji} {meta.label}</span>
      </div>

      <div className="feed-item">
        <Cover item={item} size={56} />
        <div className="feed-item-text">
          <div className="feed-item-title">{item.title}</div>
          <div className="feed-item-sub">{item.artist}{item.year ? ` · ${item.year}` : ''}</div>
        </div>
        <ScoreBadge score={ranking.score} size="lg" />
      </div>

      {ranking.note && <p className="feed-note">“{ranking.note}”</p>}

      {ranking.tags.length > 0 && (
        <div className="tag-wrap">
          {ranking.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}
    </article>
  )
}
