-- Adds geocoded coordinates for a person's current location, so the World map can
-- place someone at their actual city (e.g. Rotterdam) instead of always falling
-- back to their country's capital (Amsterdam) — the only precision available
-- before this. Populated server-side by savePerson via a geocoding lookup on
-- current_district/current_region/current_country; null when there's no district
-- to geocode yet, or when the lookup found nothing, in which case the app still
-- falls back to the country-capital point as before.

alter table people
  add column current_lat double precision,
  add column current_lng double precision;

-- Same public footing as the rest of the current_* location fields (migration
-- 013) — this is just a more precise version of data already unmasked.
create or replace view people_view with (security_invoker = true) as
select
  p.id,
  p.tree_id,
  p.first_name,
  p.last_name,
  p.patronymic,
  p.gender,
  p.is_deceased,
  p.visibility,
  p.claimed_by,
  p.created_at,
  p.updated_at,
  can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by) as details_visible,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_date end as birth_date,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_date_approx end as birth_date_approx,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.death_date end as death_date,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_country end as birth_country,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_region end as birth_region,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_district end as birth_district,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.birth_mahalla end as birth_mahalla,
  -- Current location: public, unmasked, including the geocoded point.
  p.current_country,
  p.current_region,
  p.current_district,
  p.current_address,
  p.current_lat,
  p.current_lng,
  -- Clan identity is lineage, not personal data — same as before.
  p.millat,
  p.urug,
  p.aymoq,
  p.tarmoq,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.telegram end as telegram,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.instagram end as instagram,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.photo_url end as photo_url,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.bio end as bio
from people p;

grant select on people_view to authenticated;

insert into schema_migrations (version) values ('014_current_location_coordinates') on conflict do nothing;
