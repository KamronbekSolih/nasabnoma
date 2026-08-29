-- Nasabnoma: row level security
-- Every table is scoped to owner_id = auth.uid(). For the personal MVP this just
-- means "your data is yours"; it also means adding shared/collaborative trees later
-- (phase 2) won't require a data migration, just additional policies.

alter table people enable row level security;
alter table parent_child enable row level security;
alter table spouses enable row level security;

create policy "people_owner_all" on people
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "parent_child_owner_all" on parent_child
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "spouses_owner_all" on spouses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
