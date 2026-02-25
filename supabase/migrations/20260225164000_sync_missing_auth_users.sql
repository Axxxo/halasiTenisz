-- Ensure admin can reconcile auth registrants into public.users and related accounts.

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
  select u.id, types.account_type
  from public.users u
  cross join (
    values ('membership'::public.account_type),
           ('base'::public.account_type),
           ('lighting'::public.account_type),
           ('extra'::public.account_type)
  ) as types(account_type)
  where not exists (
    select 1
    from public.accounts a
    where a.user_id = u.id
      and a.account_type = types.account_type
  );

  return inserted_count;
end;
$$;
