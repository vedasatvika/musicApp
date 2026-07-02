import type { Ranking, Sentiment } from '../types'

/** Display + scoring metadata for each sentiment bucket. */
export interface SentimentMeta {
  key: Sentiment
  label: string
  blurb: string
  color: string
  /** Inclusive score band [min, max] this bucket maps onto. */
  band: [number, number]
  emoji: string
}

// Ordered best → worst. Score bands are contiguous so the whole 0–10 range
// is covered and colors line up with the number.
export const SENTIMENTS: SentimentMeta[] = [
  { key: 'loved', label: 'Loved it', blurb: 'One of the best', color: '#3ecf8e', band: [7.6, 10.0], emoji: '🤩' },
  { key: 'liked', label: 'Liked it', blurb: 'Solid, I\'d replay', color: '#a3d977', band: [5.1, 7.5], emoji: '🙂' },
  { key: 'okay', label: 'It was fine', blurb: 'Just okay', color: '#f5c451', band: [2.6, 5.0], emoji: '😐' },
  { key: 'no', label: 'Not for me', blurb: 'Wouldn\'t go back', color: '#ef6d5b', band: [0.0, 2.5], emoji: '🙅' },
]

const BY_KEY: Record<Sentiment, SentimentMeta> = Object.fromEntries(
  SENTIMENTS.map((s) => [s.key, s]),
) as Record<Sentiment, SentimentMeta>

export function sentimentMeta(key: Sentiment): SentimentMeta {
  return BY_KEY[key]
}

/** Rank order (0 = best bucket) used to sort a mixed list. */
export function sentimentRank(key: Sentiment): number {
  return SENTIMENTS.findIndex((s) => s.key === key)
}

/** Color for a numeric score, matching the bucket bands. */
export function scoreColor(score: number): string {
  for (const s of SENTIMENTS) {
    if (score >= s.band[0]) return s.color
  }
  return SENTIMENTS[SENTIMENTS.length - 1].color
}

/**
 * Sort rankings best → worst: primary by sentiment bucket, then by score
 * within the bucket. Returns a new array.
 */
export function sortRankings(rankings: Ranking[]): Ranking[] {
  return [...rankings].sort((a, b) => {
    const bucket = sentimentRank(a.sentiment) - sentimentRank(b.sentiment)
    if (bucket !== 0) return bucket
    return b.score - a.score
  })
}

/**
 * Recompute every score from scratch based on ordered position within each
 * sentiment band. `ordered` must already be sorted best → worst *within* each
 * bucket (order across buckets doesn't matter — we regroup here). Returns a new
 * array of rankings with fresh `score` values.
 */
export function recomputeScores(rankings: Ranking[]): Ranking[] {
  const out: Ranking[] = []
  for (const meta of SENTIMENTS) {
    const inBucket = rankings.filter((r) => r.sentiment === meta.key)
    const n = inBucket.length
    const [lo, hi] = meta.band
    inBucket.forEach((r, i) => {
      // Best item in the bucket gets the top of the band, worst gets the
      // bottom. A lone item sits at the top of its band.
      const t = n === 1 ? 1 : 1 - i / (n - 1)
      const score = Math.round((lo + (hi - lo) * t) * 10) / 10
      out.push({ ...r, score })
    })
  }
  return out
}

/**
 * Compute a new sort key for an item being inserted at `index` within a bucket
 * that is already sorted best → worst. Higher key = ranked better. Uses
 * midpoint (fractional) indexing so we never have to renumber siblings.
 */
export function computeInsertSortKey(bucketBestToWorst: Ranking[], index: number): number {
  const n = bucketBestToWorst.length
  if (n === 0) return 0
  if (index <= 0) return bucketBestToWorst[0].sortKey + 1
  if (index >= n) return bucketBestToWorst[n - 1].sortKey - 1
  return (bucketBestToWorst[index - 1].sortKey + bucketBestToWorst[index].sortKey) / 2
}

/**
 * The comparison flow. Given the items already ranked in a bucket (sorted best
 * → worst) and a binary-search cursor, decide the next opponent or the final
 * insertion index. This mirrors Beli's "which did you like more?" placement.
 */
export interface CompareState {
  /** itemIds already in the bucket, best → worst. */
  pool: string[]
  lo: number
  hi: number
}

export function initCompare(bucketItemIds: string[]): CompareState {
  return { pool: bucketItemIds, lo: 0, hi: bucketItemIds.length }
}

/** The itemId to show as the opponent, or null if placement is resolved. */
export function nextOpponent(state: CompareState): string | null {
  if (state.lo >= state.hi) return null
  const mid = Math.floor((state.lo + state.hi) / 2)
  return state.pool[mid]
}

/** Advance the search. `preferredNew` = user liked the new item more. */
export function applyComparison(state: CompareState, preferredNew: boolean): CompareState {
  const mid = Math.floor((state.lo + state.hi) / 2)
  return preferredNew
    ? { ...state, hi: mid } // new item is better → search upper half
    : { ...state, lo: mid + 1 } // new item is worse → search lower half
}

/** Final 0-based insertion index within the bucket once search resolves. */
export function insertionIndex(state: CompareState): number {
  return state.lo
}
