-- Moves from edge-based relations (parent_child + spouses) to the GEDCOM-style
-- family-unit model used by every interoperable genealogy system.
--
-- Why: an edge list can express things that aren't real ("two fathers"), can't say
-- which mother a child belongs to when a father remarried, and forces siblings to be
-- *inferred*. A family row holds a couple and their children together, so the shape
-- of the data matches the shape of a family — and GEDCOM import/export becomes a
-- direct mapping instead of a reconstruction.
--
-- GEDCOM names the partner slots HUSB/WIFE; the spec notes the same record covers
-- "cultural parallels" (cohabitation, single parents, fostering). Either slot may be
-- null: a family with one partner is a single-parent family.

-- Every step below is written to be safe to re-run, so a failure part-way through
-- can be fixed and the whole file executed again.

-- === 1. New tables ===
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  husband_id uuid references people(id) on delete cascade,
  wife_id uuid references people(id) on delete cascade,
  relation_type text not null default 'married'
    check (relation_type in ('married', 'divorced', 'widowed', 'partners', 'unknown')),
  married_date date,
  marriage_order int not null default 1,
  created_at timestamptz not null default now(),
  -- At least one partner, and never the same person twice.
  check (husband_id is not null or wife_id is not null),
  check (husband_id is distinct from wife_id)
);

-- One family per couple. NULLS NOT DISTINCT so single-parent families dedupe too.
create unique index if not exists families_couple_key
  on families (tree_id, husband_id, wife_id) nulls not distinct;

create table if not exists family_children (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references people(id) on delete cascade,
  -- Tracked per parent: a child can be birth to one and step/adopted to the other,
  -- which the old single relation_type couldn't express.
  father_relation text not null default 'birth'
    check (father_relation in ('birth', 'adopted', 'step', 'foster')),
  mother_relation text not null default 'birth'
    check (mother_relation in ('birth', 'adopted', 'step', 'foster')),
  created_at timestamptz not null default now(),
  unique (family_id, child_id)
);

-- A person belongs to at most one family as a child (their parents). Enforced here
-- so "two fathers" is structurally impossible rather than something we check for.
create unique index if not exists family_children_child_key on family_children (child_id);

create index if not exists idx_families_tree on families(tree_id);
create index if not exists idx_families_husband on families(husband_id);
create index if not exists idx_families_wife on families(wife_id);
create index if not exists idx_family_children_tree on family_children(tree_id);
create index if not exists idx_family_children_family on family_children(family_id);

-- === 2 & 3. Move the old edge data into families ===
-- Wrapped so a re-run after step 6 (which renames the source tables away) is a
-- no-op instead of an error. Postgres has no max() for uuid, so each gender's
-- parent is picked with a filtered array_agg — NULL when that parent is unknown.
do $$
begin
  if to_regclass('public.spouses') is not null then
    -- Gender picks the slot; a same-gender pair still fills both so nothing is lost.
    insert into families (tree_id, husband_id, wife_id, relation_type, married_date, marriage_order)
    select
      s.tree_id,
      case when p1.gender = 'male' then p1.id
           when p2.gender = 'male' then p2.id
           else p1.id end,
      case when p1.gender = 'female' then p1.id
           when p2.gender = 'female' then p2.id
           else p2.id end,
      s.status,
      s.married_date,
      s.marriage_order
    from spouses s
    join people p1 on p1.id = s.person1_id
    join people p2 on p2.id = s.person2_id
    on conflict do nothing;
  end if;

  if to_regclass('public.parent_child') is not null then
    -- Couples that had children but no marriage record on file.
    insert into families (tree_id, husband_id, wife_id, relation_type)
    select
      pc.tree_id,
      (array_agg(pc.parent_id) filter (where pp.gender = 'male'))[1],
      (array_agg(pc.parent_id) filter (where pp.gender = 'female'))[1],
      'unknown'
    from parent_child pc
    join people pp on pp.id = pc.parent_id
    group by pc.tree_id, pc.child_id
    on conflict do nothing;

    insert into family_children (tree_id, family_id, child_id, father_relation, mother_relation)
    select
      cp.tree_id,
      f.id,
      cp.child_id,
      case when cp.father_rel = 'adopted' then 'adopted' else 'birth' end,
      case when cp.mother_rel = 'adopted' then 'adopted' else 'birth' end
    from (
      select
        pc.tree_id,
        pc.child_id,
        (array_agg(pc.parent_id) filter (where pp.gender = 'male'))[1] as father_id,
        (array_agg(pc.parent_id) filter (where pp.gender = 'female'))[1] as mother_id,
        coalesce((array_agg(pc.relation_type) filter (where pp.gender = 'male'))[1], 'blood') as father_rel,
        coalesce((array_agg(pc.relation_type) filter (where pp.gender = 'female'))[1], 'blood') as mother_rel
      from parent_child pc
      join people pp on pp.id = pc.parent_id
      group by pc.tree_id, pc.child_id
    ) cp
    join families f
      on f.tree_id = cp.tree_id
     and f.husband_id is not distinct from cp.father_id
     and f.wife_id is not distinct from cp.mother_id
    on conflict do nothing;
  end if;
end
$$;

-- === 4. Cycle guard, ported to the new model ===
-- Without it, making someone their own ancestor sends the tree layout's parent walk
-- into an infinite loop rather than raising an error.
create or replace function check_family_child_cycle()
returns trigger
language plpgsql
as $$
declare
  parent_ids uuid[];
begin
  select array_remove(array[f.husband_id, f.wife_id], null)
    into parent_ids
  from families f
  where f.id = new.family_id;

  if new.child_id = any(parent_ids) then
    raise exception 'Odam oʻzining ota-onasi boʻla olmaydi.';
  end if;

  if exists (
    with recursive descendants as (
      select fc.child_id as id
      from family_children fc
      join families f on f.id = fc.family_id
      where new.child_id in (f.husband_id, f.wife_id)
      union
      select fc.child_id
      from family_children fc
      join families f on f.id = fc.family_id
      join descendants d on d.id in (f.husband_id, f.wife_id)
    )
    select 1 from descendants where id = any(parent_ids)
  ) then
    raise exception 'Bu bogʻlanish halqa hosil qiladi — tanlangan odam allaqachon avlod hisoblanadi.';
  end if;

  return new;
end;
$$;

drop trigger if exists family_children_no_cycles on family_children;
create trigger family_children_no_cycles
before insert or update on family_children
for each row execute function check_family_child_cycle();

-- Same guard from the other direction: setting a partner who is already a descendant
-- of this family's children would close the same loop.
create or replace function check_family_partner_cycle()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from family_children fc
    where fc.family_id = new.id
      and fc.child_id in (new.husband_id, new.wife_id)
  ) then
    raise exception 'Odam oʻzining ota-onasi boʻla olmaydi.';
  end if;
  return new;
end;
$$;

drop trigger if exists families_no_cycles on families;
create trigger families_no_cycles
before insert or update on families
for each row execute function check_family_partner_cycle();

-- === 5. RLS ===
alter table families enable row level security;
alter table family_children enable row level security;

drop policy if exists "families_member_all" on families;
create policy "families_member_all" on families
  for all to authenticated
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

drop policy if exists "family_children_member_all" on family_children;
create policy "family_children_member_all" on family_children
  for all to authenticated
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

-- === 6. Retire the old tables ===
-- Renamed rather than dropped so the pre-migration state stays recoverable. Once the
-- tree renders correctly you can: drop table parent_child_legacy, spouses_legacy;
do $$
begin
  if to_regclass('public.parent_child') is not null then
    alter table parent_child rename to parent_child_legacy;
  end if;
  if to_regclass('public.spouses') is not null then
    alter table spouses rename to spouses_legacy;
  end if;
end
$$;
