-- Locks down the whole RPC surface, and fixes a mistake in migration 022.
--
-- 022 tried to keep unauthenticated callers away from the claim functions with
-- `revoke execute ... from anon`. That does nothing on its own: Postgres grants
-- EXECUTE on every new function to PUBLIC, and `anon` inherits it, so the
-- function stays callable at /rest/v1/rpc/<name> with just the public anon key.
-- Migration 019 got this right by revoking from `public, anon, authenticated`;
-- 022 did not, and Supabase's own advisor caught it. Verified with
-- has_function_privilege('anon', ...) before and after.
--
-- Two categories, treated differently:
--
-- 1. Trigger functions are invoked by the trigger machinery as the table owner,
--    never by a client, and EXECUTE is not consulted for that. They have no
--    business being reachable over the API at all, so everyone loses EXECUTE.
--
-- 2. Real RPCs and the RLS helper functions keep `authenticated` and lose
--    everyone else. `authenticated` is not optional for the helpers: an RLS
--    policy expression is evaluated with the querying role's privileges, so
--    revoking EXECUTE on is_tree_member/can_view_details/shares_tree_with would
--    make every read of the tables and views that use them fail outright.
--    Anonymous callers already have no policy granting them rows, so they are
--    stopped a step earlier regardless.
--
-- Also sets a fixed search_path on the three functions still flagged for a
-- mutable one, using ALTER rather than CREATE OR REPLACE so the bodies (two of
-- which enforce cycle checks) are not retyped and cannot be altered by accident.

-- 1. Trigger-only functions: unreachable from the API.
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function record_person_revision() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function check_family_child_cycle() from public, anon, authenticated;
revoke execute on function check_family_partner_cycle() from public, anon, authenticated;

-- 2. Client RPCs: signed-in users only.
revoke execute on function claim_person(uuid) from public, anon;
revoke execute on function release_own_claim(uuid) from public, anon;
revoke execute on function revoke_claim(uuid) from public, anon;
revoke execute on function create_tree(text) from public, anon;
revoke execute on function join_tree_by_code(text) from public, anon;
revoke execute on function merge_people(uuid, uuid) from public, anon;
revoke execute on function find_or_create_family(uuid, uuid, uuid, text) from public, anon;
revoke execute on function country_distribution(uuid) from public, anon;
revoke execute on function save_person_relations(uuid, uuid, uuid, jsonb, jsonb) from public, anon;

grant execute on function claim_person(uuid) to authenticated;
grant execute on function release_own_claim(uuid) to authenticated;
grant execute on function revoke_claim(uuid) to authenticated;
grant execute on function create_tree(text) to authenticated;
grant execute on function join_tree_by_code(text) to authenticated;
grant execute on function merge_people(uuid, uuid) to authenticated;
grant execute on function find_or_create_family(uuid, uuid, uuid, text) to authenticated;
grant execute on function country_distribution(uuid) to authenticated;
grant execute on function save_person_relations(uuid, uuid, uuid, jsonb, jsonb) to authenticated;

-- 3. RLS helpers: same treatment, but `authenticated` is load-bearing here.
revoke execute on function is_tree_member(uuid) from public, anon;
revoke execute on function is_tree_admin(uuid) from public, anon;
revoke execute on function can_edit_tree(uuid) from public, anon;
revoke execute on function can_view_details(uuid, boolean, text, uuid) from public, anon;

grant execute on function is_tree_member(uuid) to authenticated;
grant execute on function is_tree_admin(uuid) to authenticated;
grant execute on function can_edit_tree(uuid) to authenticated;
grant execute on function can_view_details(uuid, boolean, text, uuid) to authenticated;

-- 4. Remaining mutable search_path warnings.
alter function can_view_details(uuid, boolean, text, uuid) set search_path = public;
alter function check_family_child_cycle() set search_path = public;
alter function check_family_partner_cycle() set search_path = public;

-- 5. schema_migrations is a bookkeeping table exposed through PostgREST with no
--    RLS at all. Nothing in the app reads it; it exists for humans in the SQL
--    editor. Enabling RLS with no policy makes it invisible to the API while
--    leaving migrations (which run as owner) unaffected.
alter table schema_migrations enable row level security;

insert into schema_migrations (version) values ('024_lock_down_rpc_surface') on conflict do nothing;
