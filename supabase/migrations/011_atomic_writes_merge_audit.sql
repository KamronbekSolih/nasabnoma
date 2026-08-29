-- Atomic relation writes, person merging, and an edit history.
--
-- Until now every save was delete-then-insert across separate HTTP round trips: if
-- the insert failed, the delete had already committed and relations were simply
-- gone. A plpgsql function runs inside one transaction, so these either fully apply
-- or fully roll back.

-- === 1. Edit history ===
-- Trigger-based, so nothing can write to `people` without being recorded — including
-- direct SQL. With several relatives editing shared data, "who changed grandfather's
-- birth year, and to what" has to be answerable.
create table if not exists person_revisions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  person_id uuid not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  action text not null check (action in ('insert', 'update', 'delete')),
  before jsonb,
  after jsonb
);

create index if not exists idx_person_revisions_person on person_revisions(person_id, changed_at desc);
create index if not exists idx_person_revisions_tree on person_revisions(tree_id, changed_at desc);

alter table person_revisions enable row level security;

-- History is a curation tool, and it necessarily contains pre-masking values —
-- so it stays with admins.
drop policy if exists "person_revisions_admin_select" on person_revisions;
create policy "person_revisions_admin_select" on person_revisions
  for select to authenticated
  using (is_tree_admin(tree_id));

create or replace function record_person_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into person_revisions (tree_id, person_id, changed_by, action, after)
    values (new.tree_id, new.id, auth.uid(), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    -- Skip no-op writes so the history stays readable.
    if to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then
      return new;
    end if;
    insert into person_revisions (tree_id, person_id, changed_by, action, before, after)
    values (new.tree_id, new.id, auth.uid(), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into person_revisions (tree_id, person_id, changed_by, action, before)
    values (old.tree_id, old.id, auth.uid(), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

drop trigger if exists people_audit on people;
create trigger people_audit
after insert or update or delete on people
for each row execute function record_person_revision();

-- === 2. Find-or-create a family for a couple ===
create or replace function find_or_create_family(
  p_tree_id uuid,
  p_husband_id uuid,
  p_wife_id uuid,
  p_relation_type text default 'married'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fam_id uuid;
begin
  if p_husband_id is null and p_wife_id is null then
    raise exception 'Oila kamida bitta ota-onaga ega boʻlishi kerak.';
  end if;
  if not can_edit_tree(p_tree_id) then
    raise exception 'Bu shajarani tahrirlash huquqingiz yoʻq.';
  end if;

  select id into fam_id from families
  where tree_id = p_tree_id
    and husband_id is not distinct from p_husband_id
    and wife_id is not distinct from p_wife_id;

  if fam_id is null then
    insert into families (tree_id, husband_id, wife_id, relation_type)
    values (p_tree_id, p_husband_id, p_wife_id, p_relation_type)
    returning id into fam_id;
  elsif p_relation_type <> 'unknown' then
    update families set relation_type = p_relation_type where id = fam_id;
  end if;

  return fam_id;
end;
$$;

-- === 3. One atomic save for a person's whole relationship set ===
-- p_spouses:  [{"id": uuid, "status": "married|divorced|widowed"}]
-- p_children: [{"id": uuid, "family_id": uuid|null, "father_relation": text, "mother_relation": text}]
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

  return jsonb_build_object('kept_families_with_children', to_jsonb(v_kept_with_children));
end;
$$;

-- === 4. Merge two duplicate people ===
-- Duplicates are inevitable in a collaborative tree: two relatives independently add
-- the same grandfather. Merging keeps one record, moves every relationship onto it,
-- and fills its blank fields from the other.
create or replace function merge_people(p_keep_id uuid, p_merge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tree_id uuid;
  v_keep people;
  v_merge people;
begin
  if p_keep_id = p_merge_id then
    raise exception 'Bir odamni oʻzi bilan birlashtirib boʻlmaydi.';
  end if;

  select * into v_keep from people where id = p_keep_id;
  select * into v_merge from people where id = p_merge_id;
  if v_keep.id is null or v_merge.id is null then
    raise exception 'Odam topilmadi.';
  end if;
  if v_keep.tree_id <> v_merge.tree_id then
    raise exception 'Turli shajaralardagi odamlarni birlashtirib boʻlmaydi.';
  end if;

  v_tree_id := v_keep.tree_id;
  if not is_tree_admin(v_tree_id) then
    raise exception 'Birlashtirish faqat administrator huquqi bilan mumkin.';
  end if;

  -- Fill blanks on the kept record rather than overwriting anything already there.
  update people set
    last_name         = coalesce(last_name, v_merge.last_name),
    patronymic        = coalesce(patronymic, v_merge.patronymic),
    birth_date        = coalesce(birth_date, v_merge.birth_date),
    birth_date_approx = coalesce(birth_date_approx, v_merge.birth_date_approx),
    death_date        = coalesce(death_date, v_merge.death_date),
    is_deceased       = is_deceased or v_merge.is_deceased,
    birth_country     = coalesce(birth_country, v_merge.birth_country),
    birth_region      = coalesce(birth_region, v_merge.birth_region),
    birth_district    = coalesce(birth_district, v_merge.birth_district),
    birth_mahalla     = coalesce(birth_mahalla, v_merge.birth_mahalla),
    current_country   = coalesce(current_country, v_merge.current_country),
    current_region    = coalesce(current_region, v_merge.current_region),
    current_district  = coalesce(current_district, v_merge.current_district),
    current_address   = coalesce(current_address, v_merge.current_address),
    millat            = coalesce(millat, v_merge.millat),
    urug              = coalesce(urug, v_merge.urug),
    aymoq             = coalesce(aymoq, v_merge.aymoq),
    tarmoq            = coalesce(tarmoq, v_merge.tarmoq),
    telegram          = coalesce(telegram, v_merge.telegram),
    instagram         = coalesce(instagram, v_merge.instagram),
    photo_url         = coalesce(photo_url, v_merge.photo_url),
    bio               = coalesce(nullif(bio, ''), v_merge.bio),
    claimed_by        = coalesce(claimed_by, v_merge.claimed_by)
  where id = p_keep_id;

  -- Move partner slots. Skip where it would make the kept person their own partner,
  -- or collide with a family the kept person already has.
  update families set husband_id = p_keep_id
  where husband_id = p_merge_id
    and wife_id is distinct from p_keep_id
    and not exists (
      select 1 from families f2
      where f2.tree_id = v_tree_id
        and f2.husband_id = p_keep_id
        and f2.wife_id is not distinct from families.wife_id
    );

  update families set wife_id = p_keep_id
  where wife_id = p_merge_id
    and husband_id is distinct from p_keep_id
    and not exists (
      select 1 from families f2
      where f2.tree_id = v_tree_id
        and f2.wife_id = p_keep_id
        and f2.husband_id is not distinct from families.husband_id
    );

  -- Move child links, unless the kept person already has parents recorded.
  update family_children set child_id = p_keep_id
  where child_id = p_merge_id
    and not exists (select 1 from family_children fc where fc.child_id = p_keep_id);

  -- Anything left pointing at the merged record goes away with it.
  delete from families where p_merge_id in (husband_id, wife_id);
  delete from people where id = p_merge_id;
end;
$$;

-- === 5. Claim your own record ===
create or replace function claim_person(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tree_id uuid;
  v_claimed uuid;
begin
  select tree_id, claimed_by into v_tree_id, v_claimed from people where id = p_person_id;
  if v_tree_id is null then
    raise exception 'Odam topilmadi.';
  end if;
  if not is_tree_member(v_tree_id) then
    raise exception 'Siz bu shajara aʼzosi emassiz.';
  end if;
  if v_claimed is not null and v_claimed <> auth.uid() then
    raise exception 'Bu yozuv allaqachon boshqa foydalanuvchiga biriktirilgan.';
  end if;

  update people set claimed_by = auth.uid() where id = p_person_id;
end;
$$;

insert into schema_migrations (version) values ('011_atomic_writes_merge_audit') on conflict do nothing;
