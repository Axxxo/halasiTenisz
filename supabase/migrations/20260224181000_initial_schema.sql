-- Halasi Tenisz Club initial schema
-- Phase 1 baseline: auth/profile, booking core, finance core, content core, RLS skeleton

create extension if not exists "pgcrypto";

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  group_id uuid references public.groups(id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  surface_type text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  booker_user_id uuid not null references public.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  game_type text not null check (game_type in ('solo', 'singles', 'doubles')),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  is_peak boolean not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

create unique index if not exists bookings_court_starts_active_idx
  on public.bookings (court_id, starts_at)
  where status = 'active';

create index if not exists bookings_starts_at_idx
  on public.bookings (starts_at);

create table if not exists public.booking_players (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  is_booker boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, user_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_type text not null check (account_type in ('membership', 'base', 'lighting', 'extra')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, account_type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10, 2) not null,
  currency text not null default 'HUF',
  status_code text not null default 'N' check (status_code in ('N', 'H', 'I')),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

create index if not exists transactions_account_created_at_idx
  on public.transactions (account_id, created_at desc);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_photo_url text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text not null,
  target_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category text not null,
  title text not null,
  content text,
  file_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.static_pages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    updated_at = now();

  insert into public.accounts (user_id, account_type)
  values
    (new.id, 'membership'),
    (new.id, 'base'),
    (new.id, 'lighting'),
    (new.id, 'extra')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.groups enable row level security;
alter table public.users enable row level security;
alter table public.courts enable row level security;
alter table public.settings enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_players enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.news enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.sponsors enable row level security;
alter table public.competitions enable row level security;
alter table public.static_pages enable row level security;

drop policy if exists "users_self_select" on public.users;
create policy "users_self_select"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "users_self_update" on public.users;
create policy "users_self_update"
  on public.users for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "admin_groups_all" on public.groups;
create policy "admin_groups_all"
  on public.groups for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "courts_public_read" on public.courts;
create policy "courts_public_read"
  on public.courts for select
  using (true);

drop policy if exists "admin_courts_write" on public.courts;
create policy "admin_courts_write"
  on public.courts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "bookings_member_read" on public.bookings;
create policy "bookings_member_read"
  on public.bookings for select
  using (auth.role() = 'authenticated');

drop policy if exists "bookings_member_insert" on public.bookings;
create policy "bookings_member_insert"
  on public.bookings for insert
  with check (auth.uid() = booker_user_id);

drop policy if exists "bookings_owner_or_admin_update" on public.bookings;
create policy "bookings_owner_or_admin_update"
  on public.bookings for update
  using (auth.uid() = booker_user_id or public.is_admin())
  with check (auth.uid() = booker_user_id or public.is_admin());

drop policy if exists "booking_players_member_read" on public.booking_players;
create policy "booking_players_member_read"
  on public.booking_players for select
  using (auth.role() = 'authenticated');

drop policy if exists "booking_players_admin_write" on public.booking_players;
create policy "booking_players_admin_write"
  on public.booking_players for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "accounts_owner_or_admin_read" on public.accounts;
create policy "accounts_owner_or_admin_read"
  on public.accounts for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "accounts_admin_write" on public.accounts;
create policy "accounts_admin_write"
  on public.accounts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "transactions_owner_or_admin_read" on public.transactions;
create policy "transactions_owner_or_admin_read"
  on public.transactions for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "transactions_admin_write" on public.transactions;
create policy "transactions_admin_write"
  on public.transactions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "news_public_read" on public.news;
create policy "news_public_read"
  on public.news for select
  using (published = true);

drop policy if exists "news_admin_write" on public.news;
create policy "news_admin_write"
  on public.news for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "albums_public_read" on public.gallery_albums;
create policy "albums_public_read"
  on public.gallery_albums for select
  using (is_public = true);

drop policy if exists "albums_admin_write" on public.gallery_albums;
create policy "albums_admin_write"
  on public.gallery_albums for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "photos_public_read" on public.gallery_photos;
create policy "photos_public_read"
  on public.gallery_photos for select
  using (
    exists (
      select 1
      from public.gallery_albums ga
      where ga.id = album_id
        and ga.is_public = true
    )
  );

drop policy if exists "photos_admin_write" on public.gallery_photos;
create policy "photos_admin_write"
  on public.gallery_photos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "sponsors_public_read" on public.sponsors;
create policy "sponsors_public_read"
  on public.sponsors for select
  using (is_active = true);

drop policy if exists "sponsors_admin_write" on public.sponsors;
create policy "sponsors_admin_write"
  on public.sponsors for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "competitions_public_read" on public.competitions;
create policy "competitions_public_read"
  on public.competitions for select
  using (is_public = true);

drop policy if exists "competitions_admin_write" on public.competitions;
create policy "competitions_admin_write"
  on public.competitions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "static_pages_public_read" on public.static_pages;
create policy "static_pages_public_read"
  on public.static_pages for select
  using (true);

drop policy if exists "static_pages_admin_write" on public.static_pages;
create policy "static_pages_admin_write"
  on public.static_pages for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.settings (key, value)
values (
  'peak_hours',
  '[{"day":"monday","ranges":[{"start":"17:00","end":"21:00"}]},{"day":"tuesday","ranges":[{"start":"17:00","end":"21:00"}]},{"day":"wednesday","ranges":[{"start":"17:00","end":"21:00"}]},{"day":"thursday","ranges":[{"start":"17:00","end":"21:00"}]},{"day":"friday","ranges":[{"start":"17:00","end":"21:00"}]},{"day":"saturday","ranges":[{"start":"09:00","end":"12:00"}]},{"day":"sunday","ranges":[{"start":"09:00","end":"12:00"}]}]'::jsonb
)
on conflict (key) do nothing;
