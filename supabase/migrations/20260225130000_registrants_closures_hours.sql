-- Registrants default to non-member (palyaberlo), add membership request flag,
-- and upgrade court closures to date/hour ranges.

alter table public.users
  add column if not exists member_category text;

alter table public.users
  alter column member_category set default 'palyaberlo';

update public.users
set member_category = 'palyaberlo'
where member_category is null;

alter table public.users
  alter column member_category set not null;

alter table public.users
  drop constraint if exists users_member_category_check;

alter table public.users
  add constraint users_member_category_check
  check (member_category in ('normal', 'diak', 'versenyzoi', 'palyaberlo'));

alter table public.users
  add column if not exists membership_requested boolean not null default false;

insert into public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  member_category,
  membership_requested
)
select
  au.id,
  coalesce(au.email, ''),
  nullif(au.raw_user_meta_data ->> 'full_name', ''),
  'member',
  false,
  'palyaberlo',
  case
    when lower(coalesce(au.raw_user_meta_data ->> 'membership_requested', 'false')) in ('true', '1', 'yes', 'on')
      then true
    else false
  end
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, member_category, membership_requested)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'palyaberlo',
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'membership_requested', 'false')) in ('true', '1', 'yes', 'on')
        then true
      else false
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    membership_requested = public.users.membership_requested or excluded.membership_requested,
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

create or replace function public.sync_missing_auth_users()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Nincs jogosultság a regisztrált felhasználók szinkronizálásához.';
  end if;

  with inserted_users as (
    insert into public.users (
      id,
      email,
      full_name,
      role,
      is_active,
      member_category,
      membership_requested
    )
    select
      au.id,
      coalesce(au.email, ''),
      nullif(au.raw_user_meta_data ->> 'full_name', ''),
      'member',
      false,
      'palyaberlo',
      case
        when lower(coalesce(au.raw_user_meta_data ->> 'membership_requested', 'false')) in ('true', '1', 'yes', 'on')
          then true
        else false
      end
    from auth.users au
    left join public.users pu on pu.id = au.id
    where pu.id is null
    on conflict (id) do nothing
    returning id
  )
  select count(*) into inserted_count
  from inserted_users;

  insert into public.accounts (user_id, account_type)
  select iu.id, account_type
  from (
    select id from public.users
  ) iu
  cross join (
    values ('membership'::public.account_type),
           ('base'::public.account_type),
           ('lighting'::public.account_type),
           ('extra'::public.account_type)
  ) as types(account_type)
  where not exists (
    select 1
    from public.accounts a
    where a.user_id = iu.id
      and a.account_type = types.account_type
  );

  return inserted_count;
end;
$$;

create or replace function public.users_guard_restricted_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    tg_op = 'UPDATE'
    and auth.uid() is not null
    and auth.uid() = old.id
    and not public.is_admin()
  then
    new.role := old.role;
    new.member_category := old.member_category;
    new.is_active := old.is_active;
    new.membership_requested := old.membership_requested;
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_restricted_columns_trg on public.users;
create trigger users_guard_restricted_columns_trg
  before update on public.users
  for each row execute function public.users_guard_restricted_columns();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'court_closures'
      and column_name = 'closed_date'
  ) then
    execute 'alter table public.court_closures rename column closed_date to start_date';
  end if;
end
$$;

alter table public.court_closures
  add column if not exists start_date date;

alter table public.court_closures
  add column if not exists end_date date;

alter table public.court_closures
  add column if not exists start_hour smallint;

alter table public.court_closures
  add column if not exists end_hour smallint;

update public.court_closures
set start_date = coalesce(start_date, end_date, now()::date)
where start_date is null;

update public.court_closures
set end_date = coalesce(end_date, start_date)
where end_date is null;

alter table public.court_closures
  alter column start_date set not null;

alter table public.court_closures
  alter column end_date set not null;

alter table public.court_closures
  drop constraint if exists court_closures_court_id_closed_date_key;

drop index if exists public.court_closures_date_idx;

alter table public.court_closures
  drop constraint if exists court_closures_date_range_check;

alter table public.court_closures
  add constraint court_closures_date_range_check
  check (end_date >= start_date);

alter table public.court_closures
  drop constraint if exists court_closures_hour_range_check;

alter table public.court_closures
  add constraint court_closures_hour_range_check
  check (
    (start_hour is null and end_hour is null)
    or (
      start_hour is not null
      and end_hour is not null
      and start_hour >= 0
      and end_hour <= 24
      and start_hour < end_hour
    )
  );

create index if not exists court_closures_range_idx
  on public.court_closures (court_id, start_date, end_date);

create unique index if not exists court_closures_unique_interval_idx
  on public.court_closures (
    court_id,
    start_date,
    end_date,
    coalesce(start_hour, -1),
    coalesce(end_hour, -1)
  );

drop policy if exists "settings_public_fee_read" on public.settings;
create policy "settings_public_fee_read"
  on public.settings for select
  using (key in ('fee_rules', 'peak_hours', 'non_member_allowed_hours'));

insert into public.settings (key, value)
values (
  'non_member_allowed_hours',
  '{
    "monday": [{"start": 6, "end": 16}],
    "tuesday": [{"start": 6, "end": 16}],
    "wednesday": [{"start": 6, "end": 16}],
    "thursday": [{"start": 6, "end": 16}],
    "friday": [{"start": 6, "end": 16}],
    "saturday": [],
    "sunday": [{"start": 6, "end": 8}, {"start": 10, "end": 16}]
  }'::jsonb
)
on conflict (key)
do update set value = excluded.value || public.settings.value;
