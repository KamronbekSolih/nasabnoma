-- Reclassifies current location (country/region/district/address) as public — every
-- tree member sees it regardless of the living-person privacy mask, on the same
-- footing as millat/urugʻ/aymoq/tarmoq (lineage/whereabouts, not the personal data
-- the mask exists for: birth date, contacts, photo, biography). This is what makes
-- the "Dunyo boʻylab" world map show names to ordinary members, not just admins —
-- previously only public-opted-in or admin-visible people were named there.
--
-- Birthplace stays masked: where someone was born decades ago isn't the same
-- disclosure as where they live today, and only current location was asked for.

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
  -- Current location: public, unmasked.
  p.current_country,
  p.current_region,
  p.current_district,
  p.current_address,
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

insert into schema_migrations (version) values ('013_current_location_public') on conflict do nothing;
