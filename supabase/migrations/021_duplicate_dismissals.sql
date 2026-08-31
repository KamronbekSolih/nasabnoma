-- Makes "Bular boshqa-boshqa odamlar" (these are different people) stick.
--
-- Until now that button only did `setDismissed(prev => new Set(prev).add(key))` —
-- pure component state. The pair came back on the next refresh, so an admin
-- reviewing a tree with a few genuinely-similar cousins had to re-dismiss the same
-- false positives forever, and could never get the list down to zero.
--
-- The subtle part is the key. findDuplicateCandidates() assigns a/b purely by
-- position in the people array, and loadTreeData() orders by first_name with NO
-- tiebreaker — so for exactly the pairs that matter most (the ones whose reason is
-- literally "ism bir xil", identical first names) Postgres is free to return the
-- two rows in either order between queries, and the same logical pair surfaces as
-- (a,b) on one load and (b,a) on the next. Storing the raw `${a.id}:${b.id}` would
-- pass a manual test and then silently forget dismissals in production.
--
-- So the pair is stored canonically — smaller uuid first — and that ordering is
-- enforced by the database rather than trusted from the caller, because a check
-- constraint cannot be forgotten the way a call site can.
--
-- The person foreign keys cascade on delete: merge_people() hard-deletes the
-- merged-away row, and once a person no longer exists the pair cannot recur, so
-- its dismissal should go with it rather than linger as an orphan.

create table if not exists duplicate_dismissals (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  person_a_id uuid not null references people(id) on delete cascade,
  person_b_id uuid not null references people(id) on delete cascade,
  dismissed_by uuid references auth.users(id) on delete set null,
  dismissed_at timestamptz not null default now(),
  constraint duplicate_dismissals_ordered check (person_a_id < person_b_id)
);

create unique index if not exists duplicate_dismissals_pair_key
  on duplicate_dismissals (tree_id, person_a_id, person_b_id);

create index if not exists idx_duplicate_dismissals_tree
  on duplicate_dismissals (tree_id);

alter table duplicate_dismissals enable row level security;

-- The duplicates screen is already admin-only; the dismissals behind it are too.
drop policy if exists "duplicate_dismissals_admin_select" on duplicate_dismissals;
create policy "duplicate_dismissals_admin_select" on duplicate_dismissals
  for select to authenticated
  using (is_tree_admin(tree_id));

drop policy if exists "duplicate_dismissals_admin_insert" on duplicate_dismissals;
create policy "duplicate_dismissals_admin_insert" on duplicate_dismissals
  for insert to authenticated
  with check (is_tree_admin(tree_id));

-- Undo: an admin who dismissed a pair by mistake can bring it back.
drop policy if exists "duplicate_dismissals_admin_delete" on duplicate_dismissals;
create policy "duplicate_dismissals_admin_delete" on duplicate_dismissals
  for delete to authenticated
  using (is_tree_admin(tree_id));

insert into schema_migrations (version) values ('021_duplicate_dismissals') on conflict do nothing;
