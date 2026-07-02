import type { Ranking, Sentiment, Tag, User } from '../types'
import { recomputeScores } from '../lib/ranking'

// Helper to build a seed ranking. `rankedAt` is a relative "days ago" so the
// feed shows recent activity regardless of when the app is opened.
function r(
  itemId: string,
  sentiment: Sentiment,
  daysAgo: number,
  tags: Tag[] = [],
  note?: string,
): Ranking {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return { itemId, sentiment, tags, score: 0, rankedAt: d.toISOString(), note }
}

// Each user's list is authored best → worst within each bucket. Scores are
// filled in by recomputeScores so they always match the bands.
function buildUser(
  id: string,
  name: string,
  handle: string,
  avatarHue: number,
  rankings: Ranking[],
): User {
  return { id, name, handle, avatarHue, rankings: recomputeScores(rankings) }
}

export const CURRENT_USER_ID = 'you'

export function seedUsers(): User[] {
  return [
    buildUser('you', 'You', 'you', 265, [
      r('blond', 'loved', 6, ['late night', 'drive'], 'Nights transition is untouchable.'),
      r('igor', 'loved', 12, ['hype', 'drive']),
      r('gkmc', 'loved', 30, ['drive']),
      r('currents', 'liked', 3, ['gym', 'drive']),
      r('sos', 'liked', 9, ['sad', 'late night']),
      r('the-less-i-know', 'liked', 1, ['gym']),
      r('renaissance', 'okay', 20, ['party']),
      r('sunflower', 'okay', 45),
    ]),

    buildUser('maya', 'Maya Chen', 'maylistens', 12, [
      r('blond', 'loved', 2, ['late night', 'sad'], 'cried on the 2 train to this'),
      r('sos', 'loved', 1, ['sad', 'chill']),
      r('ctrl', 'loved', 15, ['late night']),
      r('good-days', 'loved', 4, ['chill']),
      r('currents', 'liked', 8, ['study', 'drive']),
      r('igor', 'liked', 22, ['hype']),
      r('kill-bill', 'liked', 1, ['hype']),
      r('renaissance', 'okay', 30, ['party']),
    ]),

    buildUser('diego', 'Diego Ramos', 'dgrooves', 130, [
      r('damn', 'loved', 1, ['gym', 'hype'], 'DNA. in the squat rack, no notes'),
      r('gkmc', 'loved', 5, ['drive']),
      r('mbdtf', 'loved', 18, ['hype']),
      r('money-trees', 'loved', 2, ['drive', 'chill']),
      r('flashing-lights', 'liked', 7, ['late night', 'drive']),
      r('igor', 'liked', 25, []),
      r('blond', 'okay', 40, ['late night'], 'good but overhyped imo'),
      r('sunflower', 'no', 50),
    ]),

    buildUser('priya', 'Priya Nair', 'priyaonrepeat', 45, [
      r('rumours', 'loved', 3, ['drive', 'chill'], 'Dreams every single morning'),
      r('aja', 'loved', 20, ['study', 'chill']),
      r('currents', 'loved', 6, ['study', 'late night']),
      r('dreams', 'loved', 1, ['chill']),
      r('the-less-i-know', 'liked', 4, ['gym']),
      r('chp', 'liked', 33, ['late night']),
      r('redbone', 'liked', 2, ['late night', 'chill']),
      r('renaissance', 'okay', 28, ['party']),
    ]),
  ]
}

/** IDs of users the current user follows (drives the feed + compatibility). */
export const FOLLOWING = ['maya', 'diego', 'priya']
