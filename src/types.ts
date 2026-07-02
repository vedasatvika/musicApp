// Core domain types for Tempo.

/** The four sentiment buckets, mirroring Beli's love-it / like-it / okay / no. */
export type Sentiment = 'loved' | 'liked' | 'okay' | 'no'

export type MediaType = 'song' | 'album'

/** A song or album in the shared catalog. Not user-specific. */
export interface CatalogItem {
  id: string
  type: MediaType
  title: string
  artist: string
  year: number
  /** Used to generate a deterministic gradient "cover". */
  hue: number
  emoji: string
}

/** Preset context tags a user can attach to a ranked item. */
export type Tag = 'gym' | 'late night' | 'study' | 'party' | 'drive' | 'chill' | 'sad' | 'hype'

export const ALL_TAGS: Tag[] = [
  'gym',
  'late night',
  'study',
  'party',
  'drive',
  'chill',
  'sad',
  'hype',
]

/** A user's ranking of a single catalog item. */
export interface Ranking {
  itemId: string
  sentiment: Sentiment
  tags: Tag[]
  /** 0–10 score derived from the item's position within its sentiment band. */
  score: number
  /** ISO timestamp of when it was ranked (for the feed). */
  rankedAt: string
  note?: string
}

export interface User {
  id: string
  name: string
  handle: string
  avatarHue: number
  /** Ordered best → worst. Index 0 is this user's #1. */
  rankings: Ranking[]
}
