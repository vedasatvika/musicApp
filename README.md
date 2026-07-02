# 🎵 Tempo

A **Beli-style ranking app, but for music.** Rank songs and albums the way Beli
lets you rank restaurants: react with a gut feeling, place it through quick
head-to-head comparisons, tag it, and get a precise score. Follow friends, see
what they're ranking, and check how compatible your taste is.

Built as a mobile-first web app (React + Vite + TypeScript). No backend — data
is seeded and persisted to `localStorage`, so everything works out of the box.

## Features

- **Sentiment-first rating** — every song/album goes into one of four buckets,
  each color-coded:
  - 🤩 **Loved it** (green)
  - 🙂 **Liked it** (lime)
  - 😐 **It was fine** (amber)
  - 🙅 **Not for me** (red)
- **Comparison-based ranking** — after picking a bucket, you place the item with
  a binary-search "Which do you like more?" flow (just like Beli). Your list
  stays perfectly ordered and every item gets a 0–10 score inside its color band.
- **Tags / vibes** — `#gym`, `#late night`, `#study`, `#party`, `#drive`,
  `#chill`, `#sad`, `#hype`. Filter any profile by tag.
- **Friends feed** — a reverse-chronological feed of what people you follow just
  ranked, with their sentiment, score, note, and tags.
- **Profiles with Top 10 + compatibility** — every profile shows a Top 10 and,
  for friends, a **taste-match %** based on the items you've both ranked and how
  closely your scores agree.

## How the ranking math works

- Each sentiment bucket owns a slice of the 0–10 scale (e.g. *Loved* = 7.6–10),
  so the number always matches the color.
- Within a bucket, items are ordered by your comparisons; scores are spread
  evenly across the band so #1 in a bucket sits at the top of its range.
- Placement uses a binary search: an item entering a bucket of _n_ items needs
  only ~log₂(n) comparisons to find its exact slot.

See `src/lib/ranking.ts` and `src/lib/compatibility.ts`.

## Run it

```bash
npm install
npm run dev      # open the printed URL on your phone or in a narrow browser window
```

Other scripts:

```bash
npm run build    # typecheck + production build
npm run preview  # serve the production build
```

## Project structure

```
src/
  types.ts              # domain types (Sentiment, Ranking, User, Tag…)
  data/catalog.ts       # shared song/album catalog
  data/seed.ts          # you + three friends with starter rankings
  lib/ranking.ts        # sentiment bands, scoring, comparison engine
  lib/compatibility.ts  # taste-match between two users
  store.tsx             # localStorage-backed state (React context)
  components/            # Cover, Avatar, ScoreBadge, TagChip, RankFlow
  screens/              # Feed, Search, Profile
  App.tsx               # phone shell + bottom tab bar
```

## Where a real backend would plug in

`src/store.tsx` is the single source of truth. Swapping `localStorage` for an
API (auth, a music-metadata provider like Spotify/Apple Music for the catalog,
and a social graph for real friends) is the natural next step, and would let
this ship to the App Store via Expo/Capacitor.
