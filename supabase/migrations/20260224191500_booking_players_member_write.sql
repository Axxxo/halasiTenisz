-- Allow members to manage booking_players rows for their own bookings

alter table public.booking_players enable row level security;

drop policy if exists "booking_players_member_insert_own_booking" on public.booking_players;
create policy "booking_players_member_insert_own_booking"
  on public.booking_players for insert
  with check (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.booker_user_id = auth.uid()
    )
  );

drop policy if exists "booking_players_member_delete_own_booking" on public.booking_players;
create policy "booking_players_member_delete_own_booking"
  on public.booking_players for delete
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.booker_user_id = auth.uid()
    )
  );
