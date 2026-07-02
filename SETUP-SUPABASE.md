# Connecting Tempo to Supabase (accounts + friends)

Tempo now has real accounts, friend requests, and a shared database powered by
[Supabase](https://supabase.com) (free tier is plenty). This is a **one-time
setup**. It takes about 10 minutes and needs no coding.

When you're done, the live site lets anyone sign up, rank music, add friends,
and see compatibility — with everything synced across devices and people.

---

## 1. Create a free Supabase project

1. Go to **https://supabase.com** → sign in with GitHub → **New project**.
2. Give it a name (e.g. `tempo`), set a database password (save it somewhere),
   pick a region near you, and create it. Wait ~2 minutes for it to spin up.

## 2. Create the database tables

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file [`supabase/schema.sql`](./supabase/schema.sql) from this repo,
   copy **all** of it, paste into the editor, and click **Run**.
3. You should see "Success. No rows returned." That created every table, the
   security rules, and the trigger that makes a profile when someone signs up.

## 3. Make sign-up instant (optional but recommended)

By default Supabase emails a confirmation link before login works. To let people
log in immediately after signing up:

1. Go to **Authentication → Providers → Email** (or **Authentication → Sign In /
   Providers**).
2. Turn **off** "Confirm email" → Save.

(You can leave it on if you prefer email verification — sign-up still works, users
just click the emailed link before their first login.)

## 4. Grab your two public keys

1. Go to **Project Settings → API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdxyz.supabase.co`
   - **anon public** key — a long string under "Project API keys"

> The `anon` key is **meant** to be public and shipped in the frontend. Your data
> is protected by the Row Level Security rules in the schema, not by hiding the key.

## 5. Add the keys to GitHub (so the live site can use them)

1. Go to your repo's **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add each of these:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL from step 4 |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key from step 4 |

## 6. Redeploy

The deploy runs automatically on every push, but adding secrets doesn't trigger
one. To pick up the new keys, either:

- Go to **Actions → Deploy to GitHub Pages → Run workflow**, **or**
- Push any small commit.

After it finishes (~1 min), open your site — you'll now see the **Log in / Sign
up** screen instead of the "not connected" message. 🎉

---

## Running it locally (optional)

Create a file named `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then:

```bash
npm install
npm run dev
```

`.env.local` is gitignored, so your keys stay on your machine.

---

## How it works (for the curious)

- **Auth**: Supabase email/password. A Postgres trigger auto-creates a `profiles`
  row (name + handle) the moment someone signs up.
- **Friends**: a `friend_requests` table with `pending` / `accepted` status. You
  become friends when a request is accepted; either side can remove it.
- **Rankings**: stored per user with a `sort_key` (their position from the
  head-to-head comparisons) and a denormalized 0–10 `score`.
- **Security**: Row Level Security means people can only edit their own profile,
  rankings, and requests — but can read others' so feeds and compatibility work.

All of this lives in [`supabase/schema.sql`](./supabase/schema.sql).
