import { useMemo, useState } from 'react'
import type { CatalogItem, Sentiment, Tag } from '../types'
import { ALL_TAGS } from '../types'
import { useStore } from '../store'
import {
  applyComparison,
  initCompare,
  insertionIndex,
  nextOpponent,
  SENTIMENTS,
  sentimentMeta,
  sortRankings,
} from '../lib/ranking'
import { Cover, TagChip } from './ui'
import type { CompareState } from '../lib/ranking'

type Step = 'sentiment' | 'details' | 'compare'

export function RankFlow({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const { myRankings, commitRanking, getItem } = useStore()
  const [step, setStep] = useState<Step>('sentiment')
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [note, setNote] = useState('')
  const [compare, setCompare] = useState<CompareState | null>(null)

  const existing = myRankings.find((r) => r.itemId === item.id)

  function toggleTag(t: Tag) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  function chooseSentiment(s: Sentiment) {
    setSentiment(s)
    setStep('details')
  }

  function startCompare() {
    if (!sentiment) return
    // Pool = items already in this bucket, best → worst, excluding this item.
    const pool = sortRankings(myRankings)
      .filter((r) => r.sentiment === sentiment && r.itemId !== item.id)
      .map((r) => r.itemId)
    if (pool.length === 0) {
      void commitRanking({ item, sentiment, tags, bucketIndex: 0, note })
      onClose()
      return
    }
    setCompare(initCompare(pool))
    setStep('compare')
  }

  function pick(preferredNew: boolean) {
    if (!compare || !sentiment) return
    const next = applyComparison(compare, preferredNew)
    if (nextOpponent(next) === null) {
      void commitRanking({ item, sentiment, tags, bucketIndex: insertionIndex(next), note })
      onClose()
    } else {
      setCompare(next)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        {step === 'sentiment' && (
          <SentimentStep item={item} isReRank={Boolean(existing)} onPick={chooseSentiment} onClose={onClose} />
        )}

        {step === 'details' && sentiment && (
          <DetailsStep
            item={item}
            sentiment={sentiment}
            tags={tags}
            note={note}
            onToggleTag={toggleTag}
            onNote={setNote}
            onBack={() => setStep('sentiment')}
            onNext={startCompare}
          />
        )}

        {step === 'compare' && compare && sentiment && (
          <CompareStep
            item={item}
            opponent={getItem(nextOpponent(compare)!)}
            sentiment={sentiment}
            onPick={pick}
          />
        )}
      </div>
    </div>
  )
}

function SentimentStep({
  item,
  isReRank,
  onPick,
  onClose,
}: {
  item: CatalogItem
  isReRank: boolean
  onPick: (s: Sentiment) => void
  onClose: () => void
}) {
  return (
    <>
      <div className="sheet-head">
        <div className="sheet-item">
          <Cover item={item} size={44} />
          <div>
            <div className="sheet-title">{item.title}</div>
            <div className="sheet-sub">{item.artist}</div>
          </div>
        </div>
        <button className="ghost-btn" onClick={onClose}>Cancel</button>
      </div>
      <h2 className="sheet-q">{isReRank ? 'Re-rank this — how do you feel now?' : 'How did you like it?'}</h2>
      <div className="sentiment-grid">
        {SENTIMENTS.map((s) => (
          <button
            key={s.key}
            className="sentiment-card"
            style={{ borderColor: s.color }}
            onClick={() => onPick(s.key)}
          >
            <span className="sentiment-emoji">{s.emoji}</span>
            <span className="sentiment-label" style={{ color: s.color }}>{s.label}</span>
            <span className="sentiment-blurb">{s.blurb}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function DetailsStep({
  item,
  sentiment,
  tags,
  note,
  onToggleTag,
  onNote,
  onBack,
  onNext,
}: {
  item: CatalogItem
  sentiment: Sentiment
  tags: Tag[]
  note: string
  onToggleTag: (t: Tag) => void
  onNote: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const meta = sentimentMeta(sentiment)
  return (
    <>
      <div className="sheet-head">
        <button className="ghost-btn" onClick={onBack}>Back</button>
        <span className="pill" style={{ background: meta.color }}>{meta.emoji} {meta.label}</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="sheet-item center">
        <Cover item={item} size={64} />
        <div>
          <div className="sheet-title">{item.title}</div>
          <div className="sheet-sub">{item.artist} · {item.year}</div>
        </div>
      </div>

      <div className="field-label">When does this hit? <span>(optional)</span></div>
      <div className="tag-wrap">
        {ALL_TAGS.map((t) => (
          <TagChip key={t} tag={t} active={tags.includes(t)} onClick={() => onToggleTag(t)} />
        ))}
      </div>

      <div className="field-label">Add a note <span>(optional)</span></div>
      <textarea
        className="note-input"
        placeholder="What made it land?"
        value={note}
        maxLength={140}
        onChange={(e) => onNote(e.target.value)}
      />

      <button className="primary-btn" onClick={onNext}>Continue</button>
    </>
  )
}

function CompareStep({
  item,
  opponent,
  sentiment,
  onPick,
}: {
  item: CatalogItem
  opponent: CatalogItem | undefined
  sentiment: Sentiment
  onPick: (preferredNew: boolean) => void
}) {
  const meta = sentimentMeta(sentiment)
  // A little context on how many comparisons remain isn't shown, keeping it
  // feeling like a quick gut-check the way Beli does.
  const prompt = useMemo(() => 'Which do you like more?', [])
  if (!opponent) return null
  return (
    <>
      <div className="sheet-head">
        <span className="pill" style={{ background: meta.color }}>{meta.emoji} {meta.label}</span>
      </div>
      <h2 className="sheet-q">{prompt}</h2>
      <div className="versus">
        <button className="versus-card" onClick={() => onPick(true)}>
          <Cover item={item} size={92} />
          <div className="versus-title">{item.title}</div>
          <div className="versus-sub">{item.artist}</div>
        </button>
        <div className="versus-or">vs</div>
        <button className="versus-card" onClick={() => onPick(false)}>
          <Cover item={opponent} size={92} />
          <div className="versus-title">{opponent.title}</div>
          <div className="versus-sub">{opponent.artist}</div>
        </button>
      </div>
      <p className="versus-hint">Tap the one you'd rather hear right now.</p>
    </>
  )
}
