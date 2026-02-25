-- Seed default active courts so booking grid can render in fresh/local environments.

insert into public.courts (name, surface_type, is_active, sort_order)
select seed.name, seed.surface_type, seed.is_active, seed.sort_order
from (
  values
    ('1-es palya', 'clay', true, 1),
    ('2-es palya', 'clay', true, 2),
    ('3-as palya', 'clay', true, 3)
) as seed(name, surface_type, is_active, sort_order)
where not exists (
  select 1
  from public.courts c
  where c.is_active = true
);
