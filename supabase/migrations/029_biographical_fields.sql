-- Biographical fields: education, occupation, languages, countries visited.
-- Marriage date finally gets written too — families.married_date has existed
-- since migration 009 and no code path ever set it (0 of 22 couples).
--
-- These are the fields that make the record analysable rather than merely
-- complete. Education level is the ordinal one and the statistical workhorse:
-- it groups and compares, where free text does not. Occupation, university and
-- the two lists are text, kept deliberately separate from education_level so a
-- degree in one field and a career in another (common, and the reason these
-- are not one column) both survive.
--
-- Arrays rather than a join table for languages/countries: they are read as a
-- whole, never queried across people, and a join table would cost two more
-- RLS policies to protect exactly the same rows people already protects.

alter table people
  add column if not exists education_level text,
  add column if not exists education_place text,
  add column if not exists occupation text,
  add column if not exists countries_visited text[],
  add column if not exists languages text[];

-- Constrained so the ordinal stays ordinal — free text here would give us
-- forty spellings of "oliy" and nothing countable.
alter table people drop constraint if exists people_education_level_check;
alter table people add constraint people_education_level_check
  check (education_level is null or education_level in (
    'none', 'primary', 'secondary', 'vocational', 'higher', 'postgraduate'
  ));

-- Appended to the end of people_view, never inserted mid-list: Postgres only
-- permits CREATE OR REPLACE VIEW to add columns at the end, and rebuilding the
-- view wholesale here would risk the drop/recreate that migration 026 needed.
--
-- Masked on the same rule as bio and contact details. These are biographical
-- facts about a living person, so an ordinary member sees them only once that
-- person's record is open; admins and the person themselves always do.
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
  p.current_country,
  p.current_region,
  p.current_district,
  p.current_address,
  p.current_lat,
  p.current_lng,
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
       then p.bio end as bio,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.education_level end as education_level,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.education_place end as education_place,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.occupation end as occupation,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.countries_visited end as countries_visited,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.languages end as languages
from people p;

grant select on people_view to authenticated;

-- Marriage date is written by the app layer, not by save_person_relations.
--
-- The obvious move would be threading it through that RPC, but its signature
-- is referenced verbatim by the grants and revokes migration 024 applied, and
-- rewriting a hundred-line SECURITY DEFINER function to carry one date is
-- disproportionate risk for the gain. families_write_editor already allows
-- `can_edit_tree` to UPDATE the row directly, so savePerson writes the date
-- straight to families after the relationship rewrite has resolved which
-- family each couple is.

insert into schema_migrations (version) values ('029_biographical_fields')
on conflict do nothing;
