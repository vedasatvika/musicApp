-- Tempo — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses if-not-exists / drop-and-recreate for policies).

-- ---------- Tables ----------

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  handle     text not null unique,
  avatar_hue int  not null default 265,
  created_at timestamptz not null default now()
);

-- Shared catalog cache. Whenever someone ranks a song/album we upsert it here
-- so it can be shown on feeds and profiles.
create table if not exists public.items (
  id          text primary key,
  type        text not null,
  title       text not null,
  artist      text not null,
  year        int  not null default 0,
  hue         int  not null default 0,
  emoji       text not null default '🎵',
  artwork_url text
);

create table if not exists public.rankings (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  item_id   text not null references public.items(id),
  sentiment text not null check (sentiment in ('loved','liked','okay','no')),
  tags      text[] not null default '{}',
  -- ordering within a sentiment bucket; higher = ranked better.
  sort_key  double precision not null default 0,
  -- denormalized 0-10 display score, recomputed on every change.
  score     numeric not null default 0,
  note      text,
  ranked_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists rankings_user_idx on public.rankings(user_id);
create index if not exists rankings_ranked_at_idx on public.rankings(ranked_at desc);

-- Friendships modeled as requests that become 'accepted'. A friendship exists
-- if there is an accepted row in either direction.
create table if not exists public.friend_requests (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
create index if not exists fr_requester_idx on public.friend_requests(requester);
create index if not exists fr_addressee_idx on public.friend_requests(addressee);

-- ---------- Auto-create a profile when a user signs up ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle, avatar_hue)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'New listener'),
    coalesce(nullif(new.raw_user_meta_data->>'handle', ''), 'user_' || substr(new.id::text, 1, 8)),
    coalesce((new.raw_user_meta_data->>'avatar_hue')::int, (floor(random() * 360))::int)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------

alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.rankings        enable row level security;
alter table public.friend_requests enable row level security;

-- profiles: any signed-in user can read (needed to find friends); edit only your own.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- items: readable by all signed-in users; anyone signed-in may add to the cache.
drop policy if exists "items readable" on public.items;
create policy "items readable" on public.items
  for select to authenticated using (true);

drop policy if exists "items insertable" on public.items;
create policy "items insertable" on public.items
  for insert to authenticated with check (true);

drop policy if exists "items updatable" on public.items;
create policy "items updatable" on public.items
  for update to authenticated using (true) with check (true);

-- rankings: readable by all signed-in users (for feeds, profiles, compatibility);
-- writable only by their owner.
drop policy if exists "rankings readable" on public.rankings;
create policy "rankings readable" on public.rankings
  for select to authenticated using (true);

drop policy if exists "insert own rankings" on public.rankings;
create policy "insert own rankings" on public.rankings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own rankings" on public.rankings;
create policy "update own rankings" on public.rankings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own rankings" on public.rankings;
create policy "delete own rankings" on public.rankings
  for delete to authenticated using (user_id = auth.uid());

-- friend_requests: you can see rows you're part of; create rows where you're the
-- requester; update rows addressed to you (accept/decline); delete your own rows.
drop policy if exists "see own requests" on public.friend_requests;
create policy "see own requests" on public.friend_requests
  for select to authenticated using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists "send requests" on public.friend_requests;
create policy "send requests" on public.friend_requests
  for insert to authenticated with check (requester = auth.uid());

drop policy if exists "respond to requests" on public.friend_requests;
create policy "respond to requests" on public.friend_requests
  for update to authenticated
  using (addressee = auth.uid() or requester = auth.uid())
  with check (addressee = auth.uid() or requester = auth.uid());

drop policy if exists "remove requests" on public.friend_requests;
create policy "remove requests" on public.friend_requests
  for delete to authenticated using (requester = auth.uid() or addressee = auth.uid());
