-- ============================================================================
-- 0009_scene_elements_and_grid.sql — Desenhos, Textos, Templates AoE, Attachments e Grade Hex/Offset
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Tipos de grade e offset de alinhamento em scenes
alter table public.scenes
  add column if not exists grid_type text not null default 'square'
    check (grid_type in ('none', 'square', 'hex_pointy', 'hex_flat')),
  add column if not exists grid_offset_x int not null default 0,
  add column if not exists grid_offset_y int not null default 0;

-- 2. Elementos da cena (Desenhos, Textos, Props, Montarias e Auras/Attachments)
create table if not exists public.scene_elements (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  layer text not null default 'drawing'
    check (layer in ('prop', 'mount', 'drawing', 'text', 'attachment')),
  kind text not null
    check (kind in ('freehand', 'line', 'rect', 'circle', 'cone', 'polygon', 'text', 'image', 'aura')),
  attached_to_token_id uuid references public.tokens(id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  rotation real not null default 0,
  data jsonb not null default '{}'::jsonb,
  is_locked boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scene_elements_scene_id
  on public.scene_elements (scene_id);

create index if not exists idx_scene_elements_campaign_id
  on public.scene_elements (campaign_id);

create index if not exists idx_scene_elements_token_id
  on public.scene_elements (attached_to_token_id);

create or replace function public.touch_scene_element_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_scene_elements_updated_at on public.scene_elements;
create trigger trg_scene_elements_updated_at
  before update on public.scene_elements
  for each row execute function public.touch_scene_element_updated_at();

-- 3. RLS de scene_elements
grant select, insert, update, delete on public.scene_elements to authenticated;
grant all on public.scene_elements to service_role;

alter table public.scene_elements enable row level security;

drop policy if exists scene_elements_select on public.scene_elements;
create policy scene_elements_select on public.scene_elements
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and is_hidden = false
      and exists (
        select 1 from public.scenes s
        where s.id = scene_elements.scene_id
          and s.is_active = true
      )
    )
  );

drop policy if exists scene_elements_insert on public.scene_elements;
create policy scene_elements_insert on public.scene_elements
  for insert to authenticated
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and created_by = (select auth.uid())
      and is_hidden = false
      and is_locked = false
      and layer in ('drawing', 'text', 'attachment')
      and exists (
        select 1 from public.scenes s
        where s.id = scene_elements.scene_id
          and s.is_active = true
      )
    )
  );

drop policy if exists scene_elements_update on public.scene_elements;
create policy scene_elements_update on public.scene_elements
  for update to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and created_by = (select auth.uid())
      and is_locked = false
      and is_hidden = false
      and exists (
        select 1 from public.scenes s
        where s.id = scene_elements.scene_id
          and s.is_active = true
      )
    )
  )
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and created_by = (select auth.uid())
      and is_locked = false
      and is_hidden = false
      and exists (
        select 1 from public.scenes s
        where s.id = scene_elements.scene_id
          and s.is_active = true
      )
    )
  );

drop policy if exists scene_elements_delete on public.scene_elements;
create policy scene_elements_delete on public.scene_elements
  for delete to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and created_by = (select auth.uid())
      and is_locked = false
    )
  );

-- 4. Estende broadcast_campaign_change() para scene_elements
create or replace function public.broadcast_campaign_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
  sid uuid;
  char_owner uuid;
  scene_active boolean := false;
  item_hidden boolean := false;
  base_topic text;
begin
  if tg_table_name = 'scenes' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    scene_active := coalesce(new.is_active, false) or coalesce(old.is_active, false);
    base_topic := 'campaign:' || cid::text;

    if scene_active then
      perform realtime.broadcast_changes(
        base_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    else
      perform realtime.broadcast_changes(
        base_topic || ':gm', tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;

  elsif tg_table_name = 'tokens' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    sid := coalesce(new.scene_id, old.scene_id);
    base_topic := 'campaign:' || cid::text;

    select is_active into scene_active
    from public.scenes
    where id = sid;

    item_hidden := coalesce(new.is_hidden, false) and coalesce(old.is_hidden, true);

    if coalesce(scene_active, false) and not item_hidden then
      perform realtime.broadcast_changes(
        base_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    else
      perform realtime.broadcast_changes(
        base_topic || ':gm', tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;

  elsif tg_table_name = 'scene_elements' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    sid := coalesce(new.scene_id, old.scene_id);
    base_topic := 'campaign:' || cid::text;

    select is_active into scene_active
    from public.scenes
    where id = sid;

    item_hidden := coalesce(new.is_hidden, false) and coalesce(old.is_hidden, true);

    if coalesce(scene_active, false) and not item_hidden then
      perform realtime.broadcast_changes(
        base_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    else
      perform realtime.broadcast_changes(
        base_topic || ':gm', tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;

  elsif tg_table_name = 'characters' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    char_owner := coalesce(new.owner_id, old.owner_id);
    base_topic := 'campaign:' || cid::text;

    perform realtime.broadcast_changes(
      base_topic || ':gm', tg_op, tg_op, tg_table_name, tg_table_schema, new, old
    );

    if char_owner is not null then
      perform realtime.broadcast_changes(
        base_topic || ':user:' || char_owner::text,
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;

  elsif tg_table_name = 'messages' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    base_topic := 'campaign:' || cid::text;

    perform realtime.broadcast_changes(
      base_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
    );
  end if;

  return null;
end;
$$;

drop trigger if exists trg_broadcast_scene_elements on public.scene_elements;
create trigger trg_broadcast_scene_elements
  after insert or update or delete on public.scene_elements
  for each row execute function public.broadcast_campaign_change();
