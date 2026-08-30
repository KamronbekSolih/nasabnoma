-- join_tree_by_code has been broken since migration 010: that migration renamed
-- the 'editor' role to 'member' and tightened tree_members' check constraint to
-- ('owner','admin','member','viewer'), but never updated this function, which
-- kept inserting the now-invalid 'editor'. Every join-by-code attempt since has
-- failed with "new row for relation tree_members violates check constraint
-- tree_members_role_check" — invisible until today, because Next.js redacted
-- the actual Postgres error message in production and showed a generic React
-- digest instead. Also fixes the column's own stale default for the same reason
-- (unused by any current INSERT, but wrong regardless).

alter table tree_members alter column role set default 'member';

create or replace function join_tree_by_code(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tree_id uuid;
begin
  select id into target_tree_id from trees where invite_code = trim(invite_code_input);
  if target_tree_id is null then
    raise exception 'Taklif kodi topilmadi.';
  end if;

  insert into tree_members (tree_id, user_id, role)
  values (target_tree_id, auth.uid(), 'member')
  on conflict (tree_id, user_id) do nothing;

  return target_tree_id;
end;
$$;
