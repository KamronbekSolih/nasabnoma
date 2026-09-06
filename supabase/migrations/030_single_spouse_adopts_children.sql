-- Adding a wife to a man who already has children left those children
-- motherless.
--
-- The model gives every couple its own family row, and children hang off a
-- family rather than off two people. Add children before recording a spouse and
-- save_person_relations has nowhere to put them but a solo family — (X, null).
-- Record the wife later and that makes a *second* family, (X, Y), while the
-- children stay behind in the first one. The tree then shows them as his and
-- not hers, which is wrong in the ordinary case and is also the order people
-- naturally enter a shajara in: the man, his children, and only then his wife.
--
-- This adds a final step: if this person now has exactly ONE couple family,
-- any children still sitting in a solo family of theirs move into it, and the
-- emptied solo family is dropped.
--
-- The "exactly one" guard is the whole safety of it. With two or more spouses
-- there is no way to know which marriage the children belong to, so nothing is
-- touched and the family_id picker in the edit form stays authoritative — that
-- picker is precisely how a second marriage's children get assigned. Children
-- of a genuine first wife who was never recorded would be attributed to the
-- second wife by this rule; that is the accepted trade, and recording the first
-- wife (even with no details) restores the distinction by making the count two.
--
-- Nothing to backfill: all six solo families with children in this tree belong
-- to men with no spouse recorded at all, so the rule has nothing to act on
-- until one is added.
--
-- Replaced with the identical signature so migration 024's grants and revokes
-- still attach to it, and carrying `set search_path = public` explicitly —
-- CREATE OR REPLACE FUNCTION discards a function's settings, which is exactly
-- how migration 028 silently undid that hardening once already.

create or replace function save_person_relations(
  p_person_id uuid,
  p_father_id uuid,
  p_mother_id uuid,
  p_spouses jsonb default '[]'::jsonb,
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tree_id uuid;
  v_gender text;
  v_family_id uuid;
  v_default_family uuid;
  v_spouse jsonb;
  v_child jsonb;
  v_keep_families uuid[] := '{}';
  v_kept_with_children uuid[] := '{}';
  v_rec record;
  v_couple_count int;
  v_couple_family uuid;
begin
  select tree_id, gender into v_tree_id, v_gender from people where id = p_person_id;
  if v_tree_id is null then
    raise exception 'Odam topilmadi.';
  end if;
  if not can_edit_tree(v_tree_id) then
    raise exception 'Bu shajarani tahrirlash huquqingiz yoʻq.';
  end if;

  -- --- Parents: this person's place as a child in exactly one family ---
  delete from family_children where child_id = p_person_id;
  if p_father_id is not null or p_mother_id is not null then
    v_family_id := find_or_create_family(v_tree_id, p_father_id, p_mother_id, 'unknown');
    insert into family_children (tree_id, family_id, child_id)
    values (v_tree_id, v_family_id, p_person_id)
    on conflict (family_id, child_id) do nothing;
  end if;

  -- --- Spouses: one family per partner ---
  for v_spouse in select * from jsonb_array_elements(coalesce(p_spouses, '[]'::jsonb))
  loop
    if v_gender = 'male' then
      v_family_id := find_or_create_family(
        v_tree_id, p_person_id, (v_spouse->>'id')::uuid,
        coalesce(v_spouse->>'status', 'married'));
    else
      v_family_id := find_or_create_family(
        v_tree_id, (v_spouse->>'id')::uuid, p_person_id,
        coalesce(v_spouse->>'status', 'married'));
    end if;
    v_keep_families := v_keep_families || v_family_id;
  end loop;

  -- Drop partnerships that were removed — but never silently delete a family that
  -- has children, since that would erase those children's parentage. Those keep both
  -- parents and simply lose the marriage claim.
  for v_rec in
    select f.id, exists (select 1 from family_children fc where fc.family_id = f.id) as has_children
    from families f
    where f.tree_id = v_tree_id
      and p_person_id in (f.husband_id, f.wife_id)
      and not (f.id = any(v_keep_families))
  loop
    if v_rec.has_children then
      update families set relation_type = 'unknown' where id = v_rec.id;
      v_kept_with_children := v_kept_with_children || v_rec.id;
    else
      delete from families where id = v_rec.id;
    end if;
  end loop;

  -- --- Children: attached to one of this person's families ---
  -- Default target is the person's earliest family; if they have none, a
  -- single-parent family is created so the children still have a home.
  select id into v_default_family from families
  where tree_id = v_tree_id and p_person_id in (husband_id, wife_id)
  order by marriage_order, created_at
  limit 1;

  if v_default_family is null and jsonb_array_length(coalesce(p_children, '[]'::jsonb)) > 0 then
    if v_gender = 'male' then
      v_default_family := find_or_create_family(v_tree_id, p_person_id, null, 'unknown');
    else
      v_default_family := find_or_create_family(v_tree_id, null, p_person_id, 'unknown');
    end if;
  end if;

  -- Detach children of this person that are no longer listed.
  delete from family_children fc
  using families f
  where fc.family_id = f.id
    and f.tree_id = v_tree_id
    and p_person_id in (f.husband_id, f.wife_id)
    and fc.child_id not in (
      select (value->>'id')::uuid from jsonb_array_elements(coalesce(p_children, '[]'::jsonb))
    );

  for v_child in select * from jsonb_array_elements(coalesce(p_children, '[]'::jsonb))
  loop
    v_family_id := coalesce((v_child->>'family_id')::uuid, v_default_family);
    -- A child belongs to exactly one family; moving them means clearing the old link.
    delete from family_children where child_id = (v_child->>'id')::uuid;
    insert into family_children (tree_id, family_id, child_id, father_relation, mother_relation)
    values (
      v_tree_id,
      v_family_id,
      (v_child->>'id')::uuid,
      coalesce(v_child->>'father_relation', 'birth'),
      coalesce(v_child->>'mother_relation', 'birth')
    )
    on conflict (family_id, child_id) do update
      set father_relation = excluded.father_relation,
          mother_relation = excluded.mother_relation;
  end loop;

  -- --- One spouse, so the children are hers too ---
  select count(*) into v_couple_count
  from families
  where tree_id = v_tree_id
    and husband_id is not null
    and wife_id is not null
    and p_person_id in (husband_id, wife_id);

  if v_couple_count = 1 then
    select id into v_couple_family
    from families
    where tree_id = v_tree_id
      and husband_id is not null
      and wife_id is not null
      and p_person_id in (husband_id, wife_id)
    limit 1;

    for v_rec in
      select f.id
      from families f
      where f.tree_id = v_tree_id
        and p_person_id in (f.husband_id, f.wife_id)
        -- exactly one parent slot filled: this person's, with the other unknown
        and (f.husband_id is null) <> (f.wife_id is null)
        and exists (select 1 from family_children fc where fc.family_id = f.id)
    loop
      -- Guarded against the unique (family_id, child_id) index: a child already
      -- present in the couple family keeps that row, and the stale solo one is
      -- cleared below rather than colliding here.
      update family_children fc
         set family_id = v_couple_family
       where fc.family_id = v_rec.id
         and not exists (
           select 1 from family_children x
           where x.family_id = v_couple_family
             and x.child_id = fc.child_id
         );

      delete from family_children where family_id = v_rec.id;
      delete from families where id = v_rec.id;
    end loop;
  end if;

  return jsonb_build_object('kept_families_with_children', to_jsonb(v_kept_with_children));
end;
$$;

insert into schema_migrations (version) values ('030_single_spouse_adopts_children')
on conflict do nothing;
