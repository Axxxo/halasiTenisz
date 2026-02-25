-- Admin expansion: dynamic fee settings, court closures, member categories, coaching flag.

alter table public.courts
  alter column surface_type drop not null;

alter table public.users
  add column if not exists member_category text not null default 'normal';

alter table public.users
  drop constraint if exists users_member_category_check;

alter table public.users
  add constraint users_member_category_check
  check (member_category in ('normal', 'diak', 'versenyzoi'));

alter table public.bookings
  add column if not exists is_coaching boolean not null default false;

create table if not exists public.court_closures (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  closed_date date not null,
  reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (court_id, closed_date)
);

create index if not exists court_closures_date_idx
  on public.court_closures (closed_date, court_id);

alter table public.court_closures enable row level security;

drop policy if exists "court_closures_member_read" on public.court_closures;
create policy "court_closures_member_read"
  on public.court_closures for select
  using (auth.role() = 'authenticated');

drop policy if exists "court_closures_admin_write" on public.court_closures;
create policy "court_closures_admin_write"
  on public.court_closures for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "settings_member_read" on public.settings;
create policy "settings_member_read"
  on public.settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "settings_public_fee_read" on public.settings;
create policy "settings_public_fee_read"
  on public.settings for select
  using (key in ('fee_rules', 'peak_hours'));

insert into public.settings (key, value)
values (
  'fee_rules',
  '{
    "base_rate_ft": 1000,
    "diak_offpeak_discount_pct": 50,
    "coaching_rate_ft": 1000,
    "versenyzoi_free_offpeak_hours_per_week": 6,
    "lighting_fee_ft": 0,
    "mufuves_fee_ft": 0,
    "debt_lockout_ft": 5000,
    "late_cancel_minutes": 20
  }'::jsonb
)
on conflict (key)
do update set value = excluded.value || public.settings.value;
