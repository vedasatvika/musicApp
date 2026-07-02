import type { User } from '../types'

export interface Compatibility {
  /** 0–100 overall match. */
  percent: number
  /** Items both users have ranked. */
  sharedCount: number
  /** itemIds you both love. */
  commonFavorites: string[]
}

/**
 * Compatibility between two users, based on the items they've both ranked.
 * We compare scores on shared items (closer scores → higher match) and give a
 * small confidence lift for having more overlap. With no overlap we fall back
 * to a neutral-ish score so brand-new friends aren't shown as 0%.
 */
export function compatibility(a: User, b: User): Compatibility {
  const bScores = new Map(b.rankings.map((r) => [r.itemId, r]))
  const shared: string[] = []
  const commonFavorites: string[] = []
  let agreementSum = 0

  for (const ra of a.rankings) {
    const rb = bScores.get(ra.itemId)
    if (!rb) continue
    shared.push(ra.itemId)
    // 1.0 when scores match exactly, 0.0 when they're 10 apart.
    const agreement = 1 - Math.abs(ra.score - rb.score) / 10
    agreementSum += agreement
    if (ra.sentiment === 'loved' && rb.sentiment === 'loved') {
      commonFavorites.push(ra.itemId)
    }
  }

  if (shared.length === 0) {
    return { percent: 0, sharedCount: 0, commonFavorites: [] }
  }

  const avgAgreement = agreementSum / shared.length
  // Confidence: overlap of 6+ shared items counts as full confidence.
  const confidence = Math.min(1, shared.length / 6)
  // Blend agreement toward a neutral 50% when we have little data.
  const blended = avgAgreement * confidence + 0.5 * (1 - confidence)
  return {
    percent: Math.round(blended * 100),
    sharedCount: shared.length,
    commonFavorites,
  }
}
