-- ============================================================================
-- 0005_storage.sql — Buckets de Storage (maps, tokens) e Políticas RLS
-- BuddyRPG VTT (idempotente)
-- Convenção de caminho: <campaign_id>/<uuid>.<ext>
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'maps',
    'maps',
    true,
    10485760, -- 10 MB
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'tokens',
    'tokens',
    true,
    2097152, -- 2 MB
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- Políticas para o bucket 'maps' (Somente GM faz upload/atualiza/remove)
-- ============================================================================
drop policy if exists "maps_public_read" on storage.objects;
create policy "maps_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'maps');

drop policy if exists "maps_gm_insert" on storage.objects;
create policy "maps_gm_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'maps'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "maps_gm_update" on storage.objects;
create policy "maps_gm_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'maps'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "maps_gm_delete" on storage.objects;
create policy "maps_gm_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'maps'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================================
-- Políticas para o bucket 'tokens' (Membros da campanha fazem upload; dono ou GM remove)
-- ============================================================================
drop policy if exists "tokens_public_read" on storage.objects;
create policy "tokens_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'tokens');

drop policy if exists "tokens_member_insert" on storage.objects;
create policy "tokens_member_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tokens'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "tokens_owner_or_gm_delete" on storage.objects;
create policy "tokens_owner_or_gm_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tokens'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and (
      owner = (select auth.uid())
      or public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
    )
  );
