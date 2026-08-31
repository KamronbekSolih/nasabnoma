-- Closes a privilege escalation in claim_person, plus the oversight it was missing.
--
-- claim_person gated only on is_tree_member(), which includes the read-only
-- `viewer` role. Claiming is not a label: can_view_details() (migration 010)
-- unmasks a living person's birth date, current address, coordinates, telegram,
-- instagram, photo and bio to whoever claims them. So any member — including a
-- viewer who is supposed to have no write power at all — could claim any
-- not-yet-claimed living relative and immediately read their home address and
-- contact handles. The attack is simply "claim your cousin before she does".
--
-- This was dormant only because no UI ever called the RPC. It stops being dormant
-- the moment a "Bu menman" button exists, so it is fixed first.
--
-- Gating this in React would be worthless: claim_person is SECURITY DEFINER and
-- callable directly at /rest/v1/rpc/claim_person. The check has to live here.
--
-- Three changes:
--   1. claim_person requires can_edit_tree() — owner/admin/member, never viewer.
--   2. release_own_claim() so the real person can undo a wrong self-claim; today
--      clearing claimed_by needs an UPDATE on people that a claimer may not have.
--   3. revoke_claim() so an admin can undo someone else's claim — there was no
--      revoke path at all, which is what makes "self-service" tolerable.
-- All three write through `update people`, so the people_audit trigger from
-- migration 011 records every claim and revocation as a revision automatically.

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
  -- was is_tree_member(): that let a read-only viewer unmask private details
  if not can_edit_tree(v_tree_id) then
    raise exception 'Sizda bu amal uchun huquq yoʻq.';
  end if;
  if v_claimed is not null and v_claimed <> auth.uid() then
    raise exception 'Bu yozuv allaqachon boshqa foydalanuvchiga biriktirilgan.';
  end if;

  update people set claimed_by = auth.uid() where id = p_person_id;
end;
$$;

/* Lets a person undo their own claim without needing edit rights on the row. */
create or replace function release_own_claim(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update people
     set claimed_by = null
   where id = p_person_id
     and claimed_by = auth.uid();
  if not found then
    raise exception 'Bu yozuv sizga biriktirilmagan.';
  end if;
end;
$$;

/* Admin override: detach a claim made by someone else. */
create or replace function revoke_claim(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tree_id uuid;
begin
  select tree_id into v_tree_id from people where id = p_person_id;
  if v_tree_id is null then
    raise exception 'Odam topilmadi.';
  end if;
  if not is_tree_admin(v_tree_id) then
    raise exception 'Bu amal faqat administrator huquqi bilan mumkin.';
  end if;

  update people set claimed_by = null where id = p_person_id;
end;
$$;

-- These derive their subject from auth.uid() rather than a caller-supplied user
-- id, so they are not migration 019's shape — but an unauthenticated caller has
-- no business reaching them at all.
revoke execute on function claim_person(uuid) from anon;
revoke execute on function release_own_claim(uuid) from anon;
revoke execute on function revoke_claim(uuid) from anon;

-- Advisor finding, fixed in passing: this trigger function had a mutable
-- search_path. It is reused by profiles (migration 020).
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

insert into schema_migrations (version) values ('022_claim_hardening') on conflict do nothing;
