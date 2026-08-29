-- Avatar photo storage. Bucket is public-read (files are only reachable if you know
-- the exact random path, same trust model as most avatar CDNs), but writes are
-- restricted to each user's own folder — mirrors the owner_id scoping used elsewhere.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
