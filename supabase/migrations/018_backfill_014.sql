-- One more schema_migrations gap found while applying 017's backfill: 014's
-- file has always had the trailer line, but it never actually landed in the
-- live table (likely applied via a partial copy-paste before this file was
-- finalized). Confirmed via direct query against the live database.

insert into schema_migrations (version) values ('014_current_location_coordinates') on conflict do nothing;
insert into schema_migrations (version) values ('018_backfill_014') on conflict do nothing;
