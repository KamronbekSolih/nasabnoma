-- Gives a user an identity. Until now the system knew exactly two things about a
-- signed-in person: their auth.users.id and their email — and the email was
-- readable only by themselves, never stored in any application table. That is why
-- the members list in Settings renders "Foydalanuvchi a1b2c3d4": an admin managing
-- their own family literally cannot tell which relative a row belongs to, and no
-- client-side join could fix it, because auth.users is not exposed to PostgREST.
--
-- It also blocks Telegram sign-in, which is about to become the primary way in:
-- Telegram never returns an email, so without somewhere to put a name, a Telegram
-- user would be nameless everywhere in the UI.
--
-- Design notes:
--
-- * full_name is NULLABLE and the trigger below swallows its own errors. This
--   trigger runs inside the auth.users insert transaction, so anything it raises
--   would abort account creation itself — a malformed claim from an identity
--   provider must never be able to stop someone signing up. A missing profile row
--   is a cosmetic problem the UI falls back from; a failed signup is not.
--
-- * shares_tree_with() is SECURITY DEFINER for the same reason is_tree_member()
--   is (migration 004): the profiles read policy queries tree_members, which has
--   its own RLS, and a plain function would recurse. It stays EXECUTE-able by
--   `authenticated` because Postgres checks EXECUTE on the *caller* even for
--   SECURITY DEFINER functions, and an RLS policy that calls a function the user
--   may not execute fails the whole query. Only public/anon lose it — an
--   unauthenticated caller has no auth.uid() and would always get false anyway.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  telegram_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

/* Whether the current user and another user are members of any tree together —
   the visibility rule for profiles. */
create or replace function shares_tree_with(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from tree_members mine
    join tree_members theirs on theirs.tree_id = mine.tree_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other_user_id
  );
$$;

revoke execute on function shares_tree_with(uuid) from public, anon;
grant execute on function shares_tree_with(uuid) to authenticated;

-- You can always read yourself; otherwise only people you actually share a tree
-- with. A stranger's name is not public just because they have an account.
drop policy if exists "profiles_select_shared" on profiles;
create policy "profiles_select_shared" on profiles
  for select to authenticated
  using (id = auth.uid() or shares_tree_with(id));

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- The trigger below normally creates the row, but this covers the fallback path
-- where the app self-heals a missing profile.
drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
  for insert to authenticated
  with check (id = auth.uid());

/* Creates a profile for every new account. Reads whatever the identity provider
   gave us: `full_name` from our own email signup form, `name` / `given_name` +
   `family_name` and `preferred_username` / `picture` from Telegram's OIDC claims,
   falling back to the email local-part. Deliberately cannot fail — see header. */
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into profiles (id, full_name, avatar_url, telegram_username)
    values (
      new.id,
      nullif(trim(coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        nullif(trim(concat_ws(' ',
          new.raw_user_meta_data->>'given_name',
          new.raw_user_meta_data->>'family_name'
        )), ''),
        split_part(coalesce(new.email, ''), '@', 1)
      )), ''),
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'preferred_username'
    )
    on conflict (id) do nothing;
  exception
    when others then
      -- Swallowed on purpose: a profile is not worth failing a signup over.
      null;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Existing accounts predate the trigger; give them the best name we can infer.
insert into profiles (id, full_name)
select u.id, nullif(split_part(coalesce(u.email, ''), '@', 1), '')
from auth.users u
on conflict (id) do nothing;

insert into schema_migrations (version) values ('020_profiles') on conflict do nothing;
