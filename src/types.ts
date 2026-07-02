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
  /** Used to generate a deterministic gradient "cover" (fallback art). */
  hue: number
  emoji: string
  /** Real cover art URL when the item comes from the music API. */
  artworkUrl?: string
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
  /** Ordering key within the sentiment bucket; higher = ranked better. */
  sortKey: number
  /** ISO timestamp of when it was ranked (for the feed). */
  rankedAt: string
  note?: string
}

/** A public user profile. */
export interface Profile {
  id: string
  name: string
  handle: string
  avatarHue: number
}

/** A user plus their rankings (used for profile views + compatibility). */
export interface User extends Profile {
  /** Ordered best → worst. Index 0 is this user's #1. */
  rankings: Ranking[]
}

/** Relationship of another user to the current user. */
export type FriendStatus = 'none' | 'friends' | 'incoming' | 'outgoing'

/** An incoming friend request with the sender's profile. */
export interface FriendRequest {
  id: string
  from: Profile
}
