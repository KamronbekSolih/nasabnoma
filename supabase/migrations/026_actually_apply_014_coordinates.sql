-- Applies what migration 014 was supposed to apply and never did.
--
-- 014 adds people.current_lat/current_lng and rebuilds people_view to expose
-- them. Neither happened on the live database: the columns were absent, and
-- people_view still had 013's column list. Saving any person therefore failed
-- outright with PostgREST's "Could not find the 'current_lat' column of
-- 'people' in the schema cache", because savePerson has always written those
-- two fields since the geocoding feature shipped.
--
-- How it went unnoticed, and how it was made worse:
--
-- Reads tolerated the gap silently. loadTreeData does `select *` from
-- people_view, so the missing columns simply arrived as undefined and the
-- World map fell back to country-capital points exactly as it does for a
-- person with no geocode — indistinguishable from working. Only a write
-- surfaced it.
--
-- Earlier in this project the missing '014_current_location_coordinates' row
-- in schema_migrations was spotted, judged to be harmless bookkeeping drift,
-- and "fixed" by migration 018 inserting the row. That was exactly backwards:
-- the absent row was not drift, it was the one signal that the migration had
-- never run, and backfilling it destroyed that signal. Hence this file rather
-- than an edit to 014 — 014's version row already claims to be applied, so
-- re-running it by that name would be skipped by anything keying off
-- schema_migrations.
--
-- Written idempotently (unlike 014, whose bare `add column` is why a partial
-- re-run could not be retried safely).

alter table people
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision;

-- Must be drop+create, not `create or replace view`: Postgres only allows
-- REPLACE to append columns at the end, and current_lat/current_lng belong
-- with the other current_* fields in the middle of the column list.
drop view if exists people_view;

create view people_view with (security_invoker = true) as
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

insert into schema_migrations (version) values ('026_actually_apply_014_coordinates')
on conflict do nothing;
