-- Bookkeeping fix from the code review of migration 015: migrations 009 and
-- 015 both shipped without the `insert into schema_migrations (...)` trailer
-- that every other migration since 008 ends with (README.md documents this
-- table as the manual way to see what's been applied — `select * from
-- schema_migrations order by version`). Neither omission broke anything
-- functional (no CI or integration reads this table), but both left gaps in
-- the project's own applied-migrations history. Backfilled here rather than
-- editing the already-applied files, so history stays append-only.

insert into schema_migrations (version) values ('009_family_model') on conflict do nothing;
insert into schema_migrations (version) values ('015_fix_join_tree_by_code_role') on conflict do nothing;
insert into schema_migrations (version) values ('017_backfill_schema_migrations') on conflict do nothing;
