-- Per-person document archive: scans of birth certificates, old letters,
-- passports, handwritten notes — the irreplaceable paper a family loses.
--
-- Deliberately NOT the `avatars` bucket. That one is public:true with no size
-- or MIME limit, so anyone holding a URL reads the file with no login at all.
-- That is tolerable for a face; it is not remotely acceptable for an identity
-- document. This bucket is private, capped, and image-only, and every read
-- goes through a short-lived signed URL minted server-side.
--
-- Visibility rule, as specified: a document is exactly as visible as the
-- person's own private details — `can_view_details()`, the same function that
-- masks their birth date and contacts in people_view.
--
-- NOTE on how that composes: can_view_details() only answers "may this viewer
-- see private columns"; it does NOT check tree membership, because in
-- people_view the membership check is already applied by RLS on `people`
-- underneath it. person_documents has no such table underneath, so every
-- policy here pairs it with is_tree_member() explicitly. Without that pairing,
-- a person with visibility='public' would expose their documents to any
-- authenticated user of the app, member of this tree or not.

-- === bucket ===
-- 5 MB ceiling: the client compresses to ~1600px before upload (a few hundred
-- kB), so anything approaching this is a bug or an upload that bypassed the
-- app. Image-only by MIME allowlist — the archive is scans and photos, and
-- refusing arbitrary file types keeps this from becoming general file hosting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- === index table ===
-- Storage objects alone can't carry a caption, an uploader, or an ordering, and
-- listing a bucket prefix is a poor substitute for a query. Paths are
-- `{tree_id}/{person_id}/{uuid}.jpg`, which the storage policies below parse.
create table if not exists person_documents (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  -- Full-size image. Unique so a re-recorded upload can't produce two rows
  -- pointing at one object.
  storage_path text not null unique,
  -- Separate small rendition, shown in the grid. Full size is fetched only
  -- when a document is actually opened — the archive is browsed on phones on
  -- mobile data, where pulling a dozen full scans per profile is the
  -- difference between usable and not.
  thumb_path text,
  title text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists person_documents_person_idx on person_documents (person_id, created_at desc);
create index if not exists person_documents_tree_idx on person_documents (tree_id);

alter table person_documents enable row level security;

drop policy if exists person_documents_select_member on person_documents;
create policy person_documents_select_member on person_documents
  for select to authenticated
  using (
    is_tree_member(tree_id)
    and exists (
      select 1 from people p
      where p.id = person_documents.person_id
        and can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
    )
  );

drop policy if exists person_documents_insert_editor on person_documents;
create policy person_documents_insert_editor on person_documents
  for insert to authenticated
  with check (can_edit_tree(tree_id) and uploaded_by = auth.uid());

drop policy if exists person_documents_update_editor on person_documents;
create policy person_documents_update_editor on person_documents
  for update to authenticated
  using (can_edit_tree(tree_id));

drop policy if exists person_documents_delete_editor on person_documents;
create policy person_documents_delete_editor on person_documents
  for delete to authenticated
  using (can_edit_tree(tree_id));

-- === storage policies ===

-- A storage path is text, and a malformed one would abort policy evaluation on
-- an invalid uuid cast rather than simply denying. This keeps a bad path
-- returning null (and therefore false) instead of erroring.
create or replace function try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

-- Same lesson as migrations 019 and 024: Postgres grants EXECUTE to PUBLIC by
-- default, and `anon` inherits it, so revoking from anon alone does nothing.
revoke execute on function try_uuid(text) from public, anon;
grant execute on function try_uuid(text) to authenticated;

drop policy if exists documents_read on storage.objects;
create policy documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from person_documents d
      join people p on p.id = d.person_id
      where (d.storage_path = storage.objects.name or d.thumb_path = storage.objects.name)
        and is_tree_member(d.tree_id)
        and can_view_details(p.tree_id, p.is_deceased, p.visibility, p.claimed_by)
    )
  );

-- Writes are authorised from the tree id in the path, because the
-- person_documents row does not exist yet at upload time (the file is stored
-- first, then recorded — an orphaned object wastes a little quota, whereas a
-- row pointing at a missing file would render as a broken archive entry).
drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and can_edit_tree(try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and can_edit_tree(try_uuid((storage.foldername(name))[1]))
  );

insert into schema_migrations (version) values ('027_person_documents')
on conflict do nothing;
