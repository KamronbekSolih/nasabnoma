-- Nasabnoma: core schema
-- Run in order: schema.sql -> rls.sql

create extension if not exists "pgcrypto";

create table people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  gender text not null check (gender in ('male', 'female')),
  birth_date date,
  birth_date_approx text,      -- freeform text for uncertain dates, e.g. "taxminan 1930-yillar"
  death_date date,
  is_deceased boolean not null default false,
  birth_place text,
  urug text,                    -- clan / urug / avlod name
  photo_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parent -> child edges. A child can have 0-2+ parent rows (biological and/or adoptive).
create table parent_child (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references people(id) on delete cascade,
  child_id uuid not null references people(id) on delete cascade,
  relation_type text not null default 'blood' check (relation_type in ('blood', 'adopted')),
  created_at timestamptz not null default now(),
  unique (parent_id, child_id),
  check (parent_id <> child_id)
);

-- Spouse pairs. Multiple rows per person cover remarriage / multiple wives.
create table spouses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person1_id uuid not null references people(id) on delete cascade,
  person2_id uuid not null references people(id) on delete cascade,
  status text not null default 'married' check (status in ('married', 'divorced', 'widowed')),
  marriage_order int not null default 1,
  married_date date,
  created_at timestamptz not null default now(),
  check (person1_id <> person2_id)
);

create index idx_people_owner on people(owner_id);
create index idx_parent_child_owner on parent_child(owner_id);
create index idx_parent_child_parent on parent_child(parent_id);
create index idx_parent_child_child on parent_child(child_id);
create index idx_spouses_owner on spouses(owner_id);
create index idx_spouses_p1 on spouses(person1_id);
create index idx_spouses_p2 on spouses(person2_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger people_set_updated_at
before update on people
for each row execute function set_updated_at();
