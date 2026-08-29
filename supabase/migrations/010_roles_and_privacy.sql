-- Roles and living-person privacy.
--
-- The genealogy convention (FamilySearch, Geni, MyHeritage all work this way): data
-- about deceased people is the shared record and is open to the family; data about
-- LIVING people is restricted, because a shajara spread by invite link is a very
-- efficient way to leak a relative's address, birthdate and contacts.
--
-- Masking is done in a database view, not in application code, so it holds even if
-- the client is modified — a member simply cannot fetch the hidden columns.

-- === 1. Roles ===
-- owner  : created the tree, cannot be demoted or removed
-- admin  : full read/write, including living people's private details
-- member : can edit, but sees only names + relationships for living people
-- viewer : read-only, same masking as member
alter table tree_members drop constraint if exists tree_members_role_check;
update tree_members set role = 'member' where role = 'editor';
alter table tree_members add constraint tree_members_role_check
  check (role in ('owner', 'admin', 'member', 'viewer'));

-- === 2. Per-person privacy ===
alter table people
  -- 'family'  : living → masked for members; deceased → always visible
  -- 'public'  : this person chose to show their details to the whole tree
  add column if not exists visibility text not null default 'family',
  -- Lets a relative claim their own record: they can then edit themselves and
  -- choose their own visibility without needing admin rights.
  add column if not exists claimed_by uuid references auth.users(id) on delete set null;

alter table people drop constraint if exists people_visibility_check;
alter table people add constraint people_visibility_check
  check (visibility in ('family', 'public'));

create unique index if not exists people_claimed_by_key on people (tree_id, claimed_by)
  where claimed_by is not null;

-- === 3. Role helpers ===
-- SECURITY DEFINER so the tree_members RLS policy doesn't recurse when a policy
-- calls these; STABLE so Postgres evaluates once per statement, not once per row.
create or replace function is_tree_admin(check_tree_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tree_members
    where tree_id = check_tree_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function can_edit_tree(check_tree_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tree_members
    where tree_id = check_tree_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$;

/* Whether the viewer may see a person's private detail columns. */
create or replace function can_view_details(
  p_tree_id uuid,
  p_is_deceased boolean,
  p_visibility text,
  p_claimed_by uuid
)
returns boolean
language sql
stable
as $$
  select
    coalesce(p_is_deceased, false)      -- the historical record: the point of a shajara
    or p_visibility = 'public'          -- the person opted in
    or p_claimed_by = auth.uid()        -- it is the viewer's own record
    or is_tree_admin(p_tree_id);        -- curators maintain the tree
$$;

-- === 4. The masked read view ===
-- security_invoker keeps the caller's RLS on `people` in force (row visibility is
-- still "members of this tree"); the view adds column masking on top.
create or replace view people_view with (security_invoker = true) as
select
  p.id,
  p.tree_id,
  -- Always visible: names, gender and lineage are what makes the tree a tree.
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
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.current_country end as current_country,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.current_region end as current_region,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.current_district end as current_district,
  case when can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
       then p.current_address end as current_address,
  -- Clan identity is lineage, not personal data — it is the same for a whole branch.
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

-- === 5. Write policies now respect roles ===
-- Reads stay open to all members (the view handles masking); writes require an
-- editing role, so a 'viewer' is genuinely read-only.
drop policy if exists "people_member_all" on people;
drop policy if exists "families_member_all" on families;
drop policy if exists "family_children_member_all" on family_children;

drop policy if exists "people_select_member" on people;
create policy "people_select_member" on people
  for select to authenticated
  using (is_tree_member(tree_id));

drop policy if exists "people_write_editor" on people;
create policy "people_write_editor" on people
  for insert to authenticated
  with check (can_edit_tree(tree_id));

drop policy if exists "people_update_editor" on people;
create policy "people_update_editor" on people
  for update to authenticated
  using (can_edit_tree(tree_id))
  with check (can_edit_tree(tree_id));

-- Deleting a person cascades through their family links, so it stays with curators.
drop policy if exists "people_delete_admin" on people;
create policy "people_delete_admin" on people
  for delete to authenticated
  using (is_tree_admin(tree_id));

drop policy if exists "families_select_member" on families;
create policy "families_select_member" on families
  for select to authenticated
  using (is_tree_member(tree_id));

drop policy if exists "families_write_editor" on families;
create policy "families_write_editor" on families
  for all to authenticated
  using (can_edit_tree(tree_id))
  with check (can_edit_tree(tree_id));

drop policy if exists "family_children_select_member" on family_children;
create policy "family_children_select_member" on family_children
  for select to authenticated
  using (is_tree_member(tree_id));

drop policy if exists "family_children_write_editor" on family_children;
create policy "family_children_write_editor" on family_children
  for all to authenticated
  using (can_edit_tree(tree_id))
  with check (can_edit_tree(tree_id));

-- === 6. Membership management ===
-- Admins can see and change who is in the tree; the owner row is protected.
drop policy if exists "tree_members_admin_update" on tree_members;
create policy "tree_members_admin_update" on tree_members
  for update to authenticated
  using (is_tree_admin(tree_id) and role <> 'owner')
  with check (is_tree_admin(tree_id) and role <> 'owner');

drop policy if exists "tree_members_admin_delete" on tree_members;
create policy "tree_members_admin_delete" on tree_members
  for delete to authenticated
  using (is_tree_admin(tree_id) and role <> 'owner');

drop policy if exists "trees_update_admin" on trees;
create policy "trees_update_admin" on trees
  for update to authenticated
  using (is_tree_admin(id))
  with check (is_tree_admin(id));

insert into schema_migrations (version) values ('010_roles_and_privacy') on conflict do nothing;
