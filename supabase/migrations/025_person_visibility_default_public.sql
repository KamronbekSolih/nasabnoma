-- A new person's profile should be open to the whole tree by default —
-- someone has to deliberately close it, not deliberately open it. Migration
-- 010 set the opposite default ('family', i.e. closed) when visibility was
-- first introduced, back when the safer starting point seemed to be showing
-- less. Product decision now flips that: the app layer already defaults new
-- records to 'public' (src/app/person/actions.ts), and this brings the
-- column default in line so any insert that bypasses the app — a script, a
-- future API, a manual SQL edit — gets the same default rather than quietly
-- reverting to the old, more closed one.
--
-- Deliberately does NOT touch existing rows: someone who already chose
-- 'family' (closed) made that choice under the old default and keeps it.
-- Only the default for rows that don't specify a value changes.
alter table people alter column visibility set default 'public';

insert into schema_migrations (version) values ('025_person_visibility_default_public')
on conflict do nothing;
