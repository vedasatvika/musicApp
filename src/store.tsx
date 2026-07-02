import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Ranking, Sentiment, Tag, User } from './types'
import { recomputeScores, SENTIMENTS, sortRankings } from './lib/ranking'
import { CURRENT_USER_ID, FOLLOWING, seedUsers } from './data/seed'

const STORAGE_KEY = 'tempo.state.v1'

interface PersistedState {
  users: User[]
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedState
  } catch {
    // corrupt storage — fall through to seed
  }
  return { users: seedUsers() }
}

interface CommitArgs {
  itemId: string
  sentiment: Sentiment
  tags: Tag[]
  /** 0-based insertion index *within the target sentiment bucket*. */
  bucketIndex: number
  note?: string
}

interface StoreValue {
  users: User[]
  currentUser: User
  following: User[]
  /** Insert or move a ranking for the current user, then rescore. */
  commitRanking: (args: CommitArgs) => void
  removeRanking: (itemId: string) => void
  resetAll: () => void
  getUser: (id: string) => User | undefined
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => load().users)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ users }))
    } catch {
      // ignore quota / private-mode errors
    }
  }, [users])

  const commitRanking = useCallback((args: CommitArgs) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== CURRENT_USER_ID) return u
        // Drop any existing ranking for this item, keep the rest sorted.
        const others = sortRankings(u.rankings.filter((rk) => rk.itemId !== args.itemId))

        // Split into buckets in canonical order so recomputeScores lines up.
        const byBucket = new Map<Sentiment, Ranking[]>()
        for (const s of SENTIMENTS) byBucket.set(s.key, [])
        for (const rk of others) byBucket.get(rk.sentiment)!.push(rk)

        const fresh: Ranking = {
          itemId: args.itemId,
          sentiment: args.sentiment,
          tags: args.tags,
          score: 0,
          rankedAt: new Date().toISOString(),
          note: args.note?.trim() ? args.note.trim() : undefined,
        }
        const target = byBucket.get(args.sentiment)!
        const idx = Math.max(0, Math.min(args.bucketIndex, target.length))
        target.splice(idx, 0, fresh)

        const rebuilt: Ranking[] = []
        for (const s of SENTIMENTS) rebuilt.push(...byBucket.get(s.key)!)
        return { ...u, rankings: recomputeScores(rebuilt) }
      }),
    )
  }, [])

  const removeRanking = useCallback((itemId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === CURRENT_USER_ID
          ? { ...u, rankings: recomputeScores(u.rankings.filter((rk) => rk.itemId !== itemId)) }
          : u,
      ),
    )
  }, [])

  const resetAll = useCallback(() => setUsers(seedUsers()), [])

  const value = useMemo<StoreValue>(() => {
    const currentUser = users.find((u) => u.id === CURRENT_USER_ID)!
    const following = FOLLOWING.map((id) => users.find((u) => u.id === id)).filter(
      (u): u is User => Boolean(u),
    )
    return {
      users,
      currentUser,
      following,
      commitRanking,
      removeRanking,
      resetAll,
      getUser: (id: string) => users.find((u) => u.id === id),
    }
  }, [users, commitRanking, removeRanking, resetAll])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
