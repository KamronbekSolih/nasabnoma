-- Aggregate country distribution for the "Dunyo boʻylab" map.
--
-- The privacy view (people_view) blanks current_country for living relatives unless
-- the viewer is an admin, so a map built from it would be empty for ordinary members
-- — which defeats the point of a family-across-the-world view.
--
-- This returns COUNTS PER COUNTRY ONLY, never names or rows. "12 relatives in Russia"
-- identifies nobody, so every member can see the shape of the diaspora while
-- individual locations stay masked exactly as before. SECURITY DEFINER is what lets
-- it read past the mask, so membership is checked explicitly first.

create or replace function country_distribution(p_tree_id uuid)
returns table (country text, person_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not is_tree_member(p_tree_id) then
    raise exception 'Siz bu shajara aʼzosi emassiz.';
  end if;

  return query
  select
    btrim(p.current_country)::text as country,
    count(*)::bigint as person_count
  from people p
  where p.tree_id = p_tree_id
    and p.current_country is not null
    and btrim(p.current_country) <> ''
    -- Living relatives only: the map answers "where is the family now", and a
    -- deceased person's last address is not a place anyone lives.
    and not coalesce(p.is_deceased, false)
  group by btrim(p.current_country)
  order by count(*) desc, btrim(p.current_country);
end;
$$;

insert into schema_migrations (version) values ('012_country_distribution') on conflict do nothing;
