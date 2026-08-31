-- Two fixes from the code review of migration 015:
--
-- 1. Case-sensitive invite-code matching (CONFIRMED bug). invite_code is
--    always generated lowercase (encode(gen_random_bytes(6),'hex') in
--    migration 004; the client-side regenerateInviteCode in
--    src/app/settings/actions.ts produces the same). But the manual-entry
--    field on /onboarding has no autocapitalize guard, so a mobile browser's
--    default "capitalize first letter" behaviour on a plain text input can
--    turn a correctly-typed code into one that no longer matches — the join
--    then fails with "Taklif kodi topilmadi." for a code that was actually
--    valid. Folding the *input* side to lowercase fixes this while leaving
--    the indexed `invite_code` column itself untouched, so the existing
--    unique index still serves the lookup.
--
-- 2. Duplicated tree_members insert (PLAUSIBLE altitude finding). create_tree
--    and join_tree_by_code each hardcoded their own `insert into
--    tree_members` — exactly the duplication that let migration 010's role
--    rename miss one of the two spots and go undetected for 5 migrations
--    (see 015). This doesn't remove the role literals themselves ('owner'
--    and 'member' still live at each call site, same as the valid-values
--    list still lives in the check constraint — a full enum/lookup-table
--    refactor was judged out of scope here), but it gives every future
--    "make someone a tree member" code path exactly one INSERT to get right
--    instead of independent copies.

create or replace function add_tree_member(p_tree_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into tree_members (tree_id, user_id, role)
  values (p_tree_id, p_user_id, p_role)
  on conflict (tree_id, user_id) do nothing;
end;
$$;

create or replace function create_tree(tree_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tree_id uuid;
begin
  insert into trees (name, created_by)
  values (coalesce(nullif(trim(tree_name), ''), 'Oilaviy shajara'), auth.uid())
  returning id into new_tree_id;

  perform add_tree_member(new_tree_id, auth.uid(), 'owner');
  return new_tree_id;
end;
$$;

create or replace function join_tree_by_code(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tree_id uuid;
begin
  select id into target_tree_id from trees
  where invite_code = lower(trim(invite_code_input));
  if target_tree_id is null then
    raise exception 'Taklif kodi topilmadi.';
  end if;

  perform add_tree_member(target_tree_id, auth.uid(), 'member');
  return target_tree_id;
end;
$$;

insert into schema_migrations (version) values ('016_shared_tree_member_insert_and_case_insensitive_code') on conflict do nothing;
