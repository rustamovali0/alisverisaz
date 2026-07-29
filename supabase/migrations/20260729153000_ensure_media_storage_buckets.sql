insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'cms-media',
    'cms-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cms_media_storage_select_public" on storage.objects;
drop policy if exists "cms_media_storage_insert_admin" on storage.objects;
drop policy if exists "cms_media_storage_update_admin" on storage.objects;
drop policy if exists "cms_media_storage_delete_admin" on storage.objects;

create policy "cms_media_storage_select_public"
on storage.objects for select
using (bucket_id = 'cms-media');

create policy "cms_media_storage_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'cms-media' and public.is_admin());

create policy "cms_media_storage_update_admin"
on storage.objects for update
to authenticated
using (bucket_id = 'cms-media' and public.is_admin())
with check (bucket_id = 'cms-media' and public.is_admin());

create policy "cms_media_storage_delete_admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'cms-media' and public.is_admin());
