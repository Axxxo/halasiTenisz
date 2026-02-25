-- Add non-member (palyaberlo) category and fee-rule defaults.

alter table public.users
  add column if not exists member_category text not null default 'normal';

alter table public.users
  drop constraint if exists users_member_category_check;

alter table public.users
  add constraint users_member_category_check
  check (member_category in ('normal', 'diak', 'versenyzoi', 'palyaberlo'));

insert into public.settings (key, value)
values (
  'fee_rules',
  '{
    "non_member_peak_rate_ft": 5000,
    "non_member_offpeak_rate_ft": 4000
  }'::jsonb
)
on conflict (key)
do update set value = excluded.value || public.settings.value;
