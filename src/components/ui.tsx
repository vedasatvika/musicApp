import type { CatalogItem, Tag } from '../types'
import { scoreColor } from '../lib/ranking'

/** Cover art for an item: real artwork when available, else a gradient. */
export function Cover({ item, size = 52 }: { item: CatalogItem; size?: number }) {
  const h = item.hue
  const radius = item.type === 'song' ? '50%' : Math.round(size * 0.22)
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background: `linear-gradient(140deg, hsl(${h} 70% 55%), hsl(${(h + 45) % 360} 65% 38%))`,
    fontSize: size * 0.42,
  }
  if (item.artworkUrl) {
    return (
      <img
        className="cover"
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover' }}
        src={item.artworkUrl}
        alt=""
        loading="lazy"
        aria-hidden
      />
    )
  }
  return (
    <div className="cover" style={style} aria-hidden>
      {item.emoji}
    </div>
  )
}

export function Avatar({ hue, name, size = 40 }: { hue: number; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.38,
    background: `linear-gradient(140deg, hsl(${hue} 65% 55%), hsl(${(hue + 60) % 360} 60% 40%))`,
  }
  return (
    <div className="avatar" style={style} aria-hidden>
      {initials}
    </div>
  )
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = scoreColor(score)
  return (
    <span className={`score-badge score-${size}`} style={{ background: color }}>
      {score.toFixed(1)}
    </span>
  )
}

export function TagChip({ tag, active, onClick }: { tag: Tag; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp className={`tag-chip${active ? ' active' : ''}`} onClick={onClick} type="button">
      #{tag}
    </Comp>
  )
}
