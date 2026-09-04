-- can_view_details() could return NULL instead of false.
--
-- For an UNCLAIMED person (claimed_by is null) whose visibility is 'family',
-- viewed by a non-admin, the expression evaluated to:
--
--   false                    -- not deceased
--   or false                 -- not 'public'
--   or (null = auth.uid())   -- NULL, because claimed_by is null
--   or false                 -- not an admin
--   => NULL
--
-- Every current caller happens to treat that correctly: an RLS USING clause
-- coerces NULL to false, and people_view's `case when can_view_details(...)`
-- masks on anything not true. So this was not a live leak — verified by
-- querying person_documents under an actual role switch, where a plain member
-- saw 0 rows for a closed person and the owner saw 1.
--
-- It is still worth fixing, because "safe as long as every caller coerces
-- NULL the way we expect" is a bad property for the function that decides who
-- may read someone's private data. A plpgsql caller writing
-- `if not can_view_details(...) then raise ...` would not fire on NULL and
-- would fail open. Making the false-ness explicit removes that footgun.
--
-- Strictly a tightening: NULL already behaved as false everywhere it is used,
-- so no existing access changes.

-- `set search_path` is not optional here, and forgetting it is easy: a bare
-- `create or replace function` DISCARDS the function's existing settings, so
-- omitting this line silently undid the hardening migration 024 applied and
-- re-triggered Supabase's function_search_path_mutable advisor. Caught by
-- re-running the advisor after applying; kept here so the next edit to this
-- function doesn't repeat it.
create or replace function can_view_details(
  p_tree_id uuid,
  p_is_deceased boolean,
  p_visibility text,
  p_claimed_by uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    coalesce(p_is_deceased, false)                          -- the historical record
    or p_visibility = 'public'                              -- the person opted in
    or (p_claimed_by is not null and p_claimed_by = auth.uid())  -- their own record
    or is_tree_admin(p_tree_id),                            -- curators maintain the tree
    false
  );
$$;

insert into schema_migrations (version) values ('028_can_view_details_never_null')
on conflict do nothing;
