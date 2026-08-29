-- Missing indexes. Migration 004 dropped owner_id (and with it every owner index),
-- but never added tree_id ones — so every page query was a sequential scan, and so
-- was every row's RLS membership check.
--
-- NOTE: this file originally also carried a cycle guard and a spouse-ordering
-- constraint. Both targeted parent_child/spouses, which migration 009 replaced with
-- the family model — 009 installs its own cycle triggers on the new tables. Only the
-- index work below is still relevant, so the rest was removed rather than left as
-- SQL that would silently no-op against retired tables.

create index if not exists idx_people_tree on people(tree_id);

-- getUserTrees() and every is_tree_member() / is_tree_admin() RLS check look up by
-- user_id, but the primary key is (tree_id, user_id) so it can't serve that lookup.
create index if not exists idx_tree_members_user on tree_members(user_id);

insert into schema_migrations (version) values ('008_indexes') on conflict do nothing;
