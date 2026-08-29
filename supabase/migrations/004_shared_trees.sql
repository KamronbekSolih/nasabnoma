-- Moves from "each user has their own private data" to "a tree has members".
-- Existing owner_id-scoped rows are backfilled into a new tree owned by whoever
-- created them, so nothing already entered is lost.

-- === 1. New tables ===
create table trees (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Oilaviy shajara',
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table tree_members (
  tree_id uuid not null references trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- === 2. One tree per existing data owner, backfilled from today's owner_id rows ===
insert into trees (created_by)
select distinct owner_id from people;

insert into tree_members (tree_id, user_id, role)
select id, created_by, 'owner' from trees;

-- === 3. Add tree_id to the data tables and backfill it from the new trees ===
alter table people add column tree_id uuid references trees(id) on delete cascade;
alter table parent_child add column tree_id uuid references trees(id) on delete cascade;
alter table spouses add column tree_id uuid references trees(id) on delete cascade;

update people p set tree_id = t.id from trees t where t.created_by = p.owner_id;
update parent_child pc set tree_id = t.id from trees t where t.created_by = pc.owner_id;
update spouses s set tree_id = t.id from trees t where t.created_by = s.owner_id;

alter table people alter column tree_id set not null;
alter table parent_child alter column tree_id set not null;
alter table spouses alter column tree_id set not null;

-- === 4. Drop the old per-owner policies and the now-redundant owner_id columns ===
drop policy if exists "people_owner_all" on people;
drop policy if exists "parent_child_owner_all" on parent_child;
drop policy if exists "spouses_owner_all" on spouses;

alter table people drop column owner_id;
alter table parent_child drop column owner_id;
alter table spouses drop column owner_id;

-- === 5. Membership check as SECURITY DEFINER, so the RLS policy on tree_members
--        doesn't recursively re-invoke itself when checking membership ===
create or replace function is_tree_member(check_tree_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tree_members
    where tree_id = check_tree_id and user_id = auth.uid()
  );
$$;

-- === 6. RPCs the app calls to create a tree or join one by invite code ===
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

  insert into tree_members (tree_id, user_id, role) values (new_tree_id, auth.uid(), 'owner');
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
  select id into target_tree_id from trees where invite_code = trim(invite_code_input);
  if target_tree_id is null then
    raise exception 'Taklif kodi topilmadi.';
  end if;

  insert into tree_members (tree_id, user_id, role)
  values (target_tree_id, auth.uid(), 'editor')
  on conflict (tree_id, user_id) do nothing;

  return target_tree_id;
end;
$$;

-- === 7. RLS: every data row is visible/writable only to members of its tree ===
alter table trees enable row level security;
alter table tree_members enable row level security;

create policy "trees_select_member" on trees
  for select to authenticated
  using (is_tree_member(id));

create policy "trees_insert_self" on trees
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "tree_members_select_member" on tree_members
  for select to authenticated
  using (is_tree_member(tree_id));

create policy "people_member_all" on people
  for all to authenticated
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

create policy "parent_child_member_all" on parent_child
  for all to authenticated
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

create policy "spouses_member_all" on spouses
  for all to authenticated
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));
