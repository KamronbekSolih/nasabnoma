-- Undoes a privacy regression I introduced in migration 020.
--
-- 020 backfilled existing accounts with split_part(email, '@', 1), so
-- "ikkinchi.kamronbeksolih@gmail.com" became the display name
-- "ikkinchi.kamronbeksolih", newly readable by every member who shares a tree
-- with them. Before profiles existed, no member could see any part of another
-- member's email address at all — auth.users is not exposed to PostgREST. A
-- convenience default is not a good enough reason to widen that.
--
-- Cleared back to NULL. The UI falls back to "Foydalanuvchi" and prompts people
-- to set a real name on /profile, which is theirs to disclose.
--
-- Only clears names that still exactly match the email local-part, so a name
-- someone has already chosen for themselves is never overwritten.

update profiles p
   set full_name = null
  from auth.users u
 where u.id = p.id
   and p.full_name is not null
   and p.full_name = split_part(coalesce(u.email, ''), '@', 1);

insert into schema_migrations (version) values ('023_backfill_privacy') on conflict do nothing;
