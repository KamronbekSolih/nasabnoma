-- SECURITY FIX for a hole introduced by migration 016. add_tree_member takes
-- p_user_id and p_role as direct, caller-controlled arguments (unlike
-- create_tree/join_tree_by_code, which derive user_id from auth.uid() and
-- hardcode the role as a literal — the caller controls neither). Being
-- SECURITY DEFINER (bypasses RLS) with Postgres's default PUBLIC execute
-- grant, it was reachable directly at /rest/v1/rpc/add_tree_member by any
-- authenticated user, who could pass any tree_id + their own user_id +
-- role: 'owner' to grant themselves ownership of a tree they have no
-- relationship to. Caught by Supabase's own security advisor immediately
-- after 016 shipped.
--
-- create_tree and join_tree_by_code remain safe callers of this helper:
-- SECURITY DEFINER functions run as their owner, which always retains
-- EXECUTE on functions it owns, so revoking direct access for anon/
-- authenticated only closes the public REST endpoint, not the internal call.

revoke execute on function add_tree_member(uuid, uuid, text) from public, anon, authenticated;

insert into schema_migrations (version) values ('019_lock_down_add_tree_member') on conflict do nothing;
