import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type {
  CatalogItem,
  FriendRequest,
  FriendStatus,
  Profile,
  Ranking,
  Sentiment,
  Tag,
  User,
} from './types'
import { supabase, isConfigured } from './lib/supabase'
import { computeInsertSortKey, recomputeScores, sortRankings } from './lib/ranking'

// ---------- Row mappers ----------

interface ProfileRow { id: string; name: string; handle: string; avatar_hue: number }
interface ItemRow {
  id: string; type: string; title: string; artist: string
  year: number; hue: number; emoji: string; artwork_url: string | null
}
interface RankingRow {
  item_id: string; sentiment: Sentiment; tags: string[] | null
  score: number | string; sort_key: number; note: string | null; ranked_at: string
}

function mapProfile(r: ProfileRow): Profile {
  return { id: r.id, name: r.name, handle: r.handle, avatarHue: r.avatar_hue }
}
function mapItem(r: ItemRow): CatalogItem {
  return {
    id: r.id, type: r.type as CatalogItem['type'], title: r.title, artist: r.artist,
    year: r.year, hue: r.hue, emoji: r.emoji, artworkUrl: r.artwork_url ?? undefined,
  }
}
function mapRanking(r: RankingRow): Ranking {
  return {
    itemId: r.item_id, sentiment: r.sentiment, tags: (r.tags ?? []) as Tag[],
    score: Number(r.score), sortKey: r.sort_key, rankedAt: r.ranked_at,
    note: r.note ?? undefined,
  }
}

// ---------- Types ----------

export interface FeedEntry {
  profile: Profile
  ranking: Ranking
  item: CatalogItem
}

interface CommitArgs {
  item: CatalogItem
  sentiment: Sentiment
  tags: Tag[]
  /** 0-based insertion index within the target sentiment bucket. */
  bucketIndex: number
  note?: string
}

interface AuthResult { error?: string }

interface StoreValue {
  configured: boolean
  ready: boolean
  session: Session | null
  profile: Profile | null

  myRankings: Ranking[]
  feed: FeedEntry[]
  friends: Profile[]
  incoming: FriendRequest[]
  outgoing: Profile[]

  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (args: { email: string; password: string; name: string; handle: string }) => Promise<AuthResult>
  signOut: () => Promise<void>
  isHandleAvailable: (handle: string) => Promise<boolean>

  commitRanking: (args: CommitArgs) => Promise<void>
  removeRanking: (itemId: string) => Promise<void>

  searchUsers: (query: string) => Promise<Profile[]>
  sendRequest: (userId: string) => Promise<void>
  respondRequest: (requestId: string, accept: boolean) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
  relationship: (userId: string) => FriendStatus

  getProfileData: (userId: string) => Promise<User | null>
  getItem: (id: string) => CatalogItem | undefined
  refresh: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

// ---------- Provider ----------

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myRankings, setMyRankings] = useState<Ranking[]>([])
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<Profile[]>([])
  // id -> item metadata, resolved as we load feeds/rankings.
  const catalog = useRef<Record<string, CatalogItem>>({})

  const uid = session?.user.id ?? null

  const loadItems = useCallback(async (ids: string[]): Promise<Record<string, CatalogItem>> => {
    const missing = [...new Set(ids)].filter((id) => !catalog.current[id])
    if (missing.length && supabase) {
      const { data } = await supabase.from('items').select('*').in('id', missing)
      for (const row of (data ?? []) as ItemRow[]) catalog.current[row.id] = mapItem(row)
    }
    const out: Record<string, CatalogItem> = {}
    for (const id of ids) if (catalog.current[id]) out[id] = catalog.current[id]
    return out
  }, [])

  const refresh = useCallback(async () => {
    if (!supabase || !uid) return

    // My profile + rankings
    const [{ data: prof }, { data: rankRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('rankings').select('*').eq('user_id', uid),
    ])
    if (prof) setProfile(mapProfile(prof as ProfileRow))
    const mine = ((rankRows ?? []) as RankingRow[]).map(mapRanking)
    await loadItems(mine.map((r) => r.itemId))
    setMyRankings(sortRankings(mine))

    // Friend requests (both directions)
    const { data: reqRows } = await supabase
      .from('friend_requests')
      .select('id, requester, addressee, status')
      .or(`requester.eq.${uid},addressee.eq.${uid}`)
    const rows = (reqRows ?? []) as { id: string; requester: string; addressee: string; status: string }[]

    const friendIds = new Set<string>()
    const incomingRaw: { id: string; from: string }[] = []
    const outgoingIds: string[] = []
    for (const row of rows) {
      const other = row.requester === uid ? row.addressee : row.requester
      if (row.status === 'accepted') friendIds.add(other)
      else if (row.status === 'pending') {
        if (row.addressee === uid) incomingRaw.push({ id: row.id, from: row.requester })
        else outgoingIds.push(row.addressee)
      }
    }

    // Resolve all the profiles we referenced in one query.
    const peopleIds = [...new Set([...friendIds, ...incomingRaw.map((r) => r.from), ...outgoingIds])]
    const peopleById = new Map<string, Profile>()
    if (peopleIds.length) {
      const { data: people } = await supabase.from('profiles').select('*').in('id', peopleIds)
      for (const p of (people ?? []) as ProfileRow[]) peopleById.set(p.id, mapProfile(p))
    }

    const friendList = [...friendIds].map((id) => peopleById.get(id)).filter((p): p is Profile => !!p)
    setFriends(friendList)
    setIncoming(
      incomingRaw
        .map((r) => (peopleById.get(r.from) ? { id: r.id, from: peopleById.get(r.from)! } : null))
        .filter((r): r is FriendRequest => !!r),
    )
    setOutgoing(outgoingIds.map((id) => peopleById.get(id)).filter((p): p is Profile => !!p))

    // Feed: friends' recent rankings
    if (friendList.length) {
      const { data: feedRows } = await supabase
        .from('rankings')
        .select('*')
        .in('user_id', friendList.map((f) => f.id))
        .order('ranked_at', { ascending: false })
        .limit(40)
      const fr = (feedRows ?? []) as (RankingRow & { user_id: string })[]
      const items = await loadItems(fr.map((r) => r.item_id))
      const friendById = new Map(friendList.map((f) => [f.id, f]))
      setFeed(
        fr
          .map((row) => {
            const p = friendById.get(row.user_id)
            const item = items[row.item_id]
            return p && item ? { profile: p, ranking: mapRanking(row), item } : null
          })
          .filter((e): e is FeedEntry => !!e),
      )
    } else {
      setFeed([])
    }
  }, [uid, loadItems])

  // Auth bootstrap
  useEffect(() => {
    if (!supabase) { setReady(true); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load data whenever the signed-in user changes
  useEffect(() => {
    if (uid) {
      void refresh()
    } else {
      setProfile(null); setMyRankings([]); setFeed([]); setFriends([]); setIncoming([]); setOutgoing([])
    }
  }, [uid, refresh])

  // ---------- Auth actions ----------

  const signIn = useCallback<StoreValue['signIn']>(async (email, password) => {
    if (!supabase) return { error: 'Not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: error.message } : {}
  }, [])

  const isHandleAvailable = useCallback<StoreValue['isHandleAvailable']>(async (handle) => {
    if (!supabase) return false
    const { data } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle()
    return !data
  }, [])

  const signUp = useCallback<StoreValue['signUp']>(async ({ email, password, name, handle }) => {
    if (!supabase) return { error: 'Not configured' }
    const clean = handle.trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{2,20}$/.test(clean)) {
      return { error: 'Handle must be 2–20 letters, numbers or underscores.' }
    }
    if (!(await isHandleAvailable(clean))) return { error: 'That handle is taken.' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), handle: clean } },
    })
    return error ? { error: error.message } : {}
  }, [isHandleAvailable])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  // ---------- Ranking actions ----------

  // Recompute denormalized scores for a user from their sort_key order, persist
  // the changed ones, then refresh local state.
  const rescoreAndReload = useCallback(async (userId: string) => {
    const client = supabase
    if (!client) return
    const { data } = await client.from('rankings').select('*').eq('user_id', userId)
    const rankings = ((data ?? []) as RankingRow[]).map(mapRanking)
    // Order best → worst within each bucket so recomputeScores assigns by rank.
    const ordered = [...rankings].sort((a, b) => b.sortKey - a.sortKey)
    const scored = recomputeScores(ordered)
    const changed = scored.filter((s) => {
      const prev = rankings.find((r) => r.itemId === s.itemId)
      return prev && Math.abs(prev.score - s.score) > 0.001
    })
    await Promise.all(
      changed.map((s) =>
        client.from('rankings').update({ score: s.score }).eq('user_id', userId).eq('item_id', s.itemId),
      ),
    )
    await refresh()
  }, [refresh])

  const commitRanking = useCallback<StoreValue['commitRanking']>(async (args) => {
    if (!supabase || !uid) return

    // Neighbors in the target bucket (excluding this item), best → worst.
    const bucket = sortRankings(myRankings).filter(
      (r) => r.sentiment === args.sentiment && r.itemId !== args.item.id,
    )
    const sortKey = computeInsertSortKey(bucket, args.bucketIndex)

    // Cache + persist the item metadata.
    catalog.current[args.item.id] = args.item
    await supabase.from('items').upsert({
      id: args.item.id, type: args.item.type, title: args.item.title, artist: args.item.artist,
      year: args.item.year, hue: args.item.hue, emoji: args.item.emoji,
      artwork_url: args.item.artworkUrl ?? null,
    })

    await supabase.from('rankings').upsert(
      {
        user_id: uid, item_id: args.item.id, sentiment: args.sentiment,
        tags: args.tags, sort_key: sortKey, note: args.note?.trim() || null,
        ranked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_id' },
    )

    await rescoreAndReload(uid)
  }, [uid, myRankings, rescoreAndReload])

  const removeRanking = useCallback<StoreValue['removeRanking']>(async (itemId) => {
    if (!supabase || !uid) return
    await supabase.from('rankings').delete().eq('user_id', uid).eq('item_id', itemId)
    await rescoreAndReload(uid)
  }, [uid, rescoreAndReload])

  // ---------- Friend actions ----------

  const searchUsers = useCallback<StoreValue['searchUsers']>(async (query) => {
    if (!supabase || !uid) return []
    const q = query.trim().replace(/^@/, '')
    if (!q) return []
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.ilike.%${q}%,name.ilike.%${q}%`)
      .neq('id', uid)
      .limit(20)
    return ((data ?? []) as ProfileRow[]).map(mapProfile)
  }, [uid])

  const sendRequest = useCallback<StoreValue['sendRequest']>(async (userId) => {
    if (!supabase || !uid) return
    await supabase.from('friend_requests').upsert(
      { requester: uid, addressee: userId, status: 'pending' },
      { onConflict: 'requester,addressee' },
    )
    await refresh()
  }, [uid, refresh])

  const respondRequest = useCallback<StoreValue['respondRequest']>(async (requestId, accept) => {
    if (!supabase) return
    await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', requestId)
    await refresh()
  }, [refresh])

  const removeFriend = useCallback<StoreValue['removeFriend']>(async (userId) => {
    if (!supabase || !uid) return
    await supabase
      .from('friend_requests')
      .delete()
      .or(
        `and(requester.eq.${uid},addressee.eq.${userId}),and(requester.eq.${userId},addressee.eq.${uid})`,
      )
    await refresh()
  }, [uid, refresh])

  const relationship = useCallback<StoreValue['relationship']>(
    (userId) => {
      if (friends.some((f) => f.id === userId)) return 'friends'
      if (incoming.some((r) => r.from.id === userId)) return 'incoming'
      if (outgoing.some((p) => p.id === userId)) return 'outgoing'
      return 'none'
    },
    [friends, incoming, outgoing],
  )

  const getProfileData = useCallback<StoreValue['getProfileData']>(async (userId) => {
    if (!supabase) return null
    const [{ data: prof }, { data: rankRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('rankings').select('*').eq('user_id', userId),
    ])
    if (!prof) return null
    const rankings = ((rankRows ?? []) as RankingRow[]).map(mapRanking)
    await loadItems(rankings.map((r) => r.itemId))
    return { ...mapProfile(prof as ProfileRow), rankings: sortRankings(rankings) }
  }, [loadItems])

  const value = useMemo<StoreValue>(
    () => ({
      configured: isConfigured,
      ready,
      session,
      profile,
      myRankings,
      feed,
      friends,
      incoming,
      outgoing,
      signIn,
      signUp,
      signOut,
      isHandleAvailable,
      commitRanking,
      removeRanking,
      searchUsers,
      sendRequest,
      respondRequest,
      removeFriend,
      relationship,
      getProfileData,
      getItem: (id: string) => catalog.current[id],
      refresh,
    }),
    [
      ready, session, profile, myRankings, feed, friends, incoming, outgoing,
      signIn, signUp, signOut, isHandleAvailable, commitRanking, removeRanking,
      searchUsers, sendRequest, respondRequest, removeFriend, relationship,
      getProfileData, refresh,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
