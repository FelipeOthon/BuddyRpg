-- ============================================================================
-- 0013_music_jukebox.sql — Bucket de áudio ('music') e Playlist da Campanha
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Bucket 'music' no Supabase Storage (apenas GM faz upload; leitura pública)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music',
  'music',
  true,
  20971520, -- 20 MB
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/mp4',
    'audio/aac'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "music_public_read" on storage.objects;
create policy "music_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'music');

drop policy if exists "music_gm_insert" on storage.objects;
create policy "music_gm_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'music'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "music_gm_update" on storage.objects;
create policy "music_gm_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'music'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "music_gm_delete" on storage.objects;
create policy "music_gm_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'music'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_gm(((storage.foldername(name))[1])::uuid)
  );

-- 2. Tabela campaign_tracks (faixas salvas na campanha pelo Mestre)
create table if not exists public.campaign_tracks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  url text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_tracks_campaign_id
  on public.campaign_tracks (campaign_id);

grant select, insert, update, delete on public.campaign_tracks to authenticated;
grant all on public.campaign_tracks to service_role;

alter table public.campaign_tracks enable row level security;

drop policy if exists campaign_tracks_select on public.campaign_tracks;
create policy campaign_tracks_select on public.campaign_tracks
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists campaign_tracks_insert on public.campaign_tracks;
create policy campaign_tracks_insert on public.campaign_tracks
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_tracks_update on public.campaign_tracks;
create policy campaign_tracks_update on public.campaign_tracks
  for update to authenticated
  using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_tracks_delete on public.campaign_tracks;
create policy campaign_tracks_delete on public.campaign_tracks
  for delete to authenticated
  using (public.is_campaign_gm(campaign_id));
