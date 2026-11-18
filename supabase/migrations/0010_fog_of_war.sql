-- ============================================================================
-- 0010_fog_of_war.sql — Névoa de Guerra Estática, Slice e Suporte Híbrido
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Configurações de Névoa na cena
alter table public.scenes
  add column if not exists fog_enabled boolean not null default false,
  add column if not exists fog_mode text not null default 'static'
    check (fog_mode in ('static', 'dynamic', 'hybrid')),
  add column if not exists fog_color text not null default '#09090b';

-- 2. Formas da Névoa de Guerra (cover / reveal)
create table if not exists public.scene_fog_shapes (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  operation text not null check (operation in ('cover', 'reveal')),
  shape_kind text not null check (shape_kind in ('rect', 'circle', 'polygon')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_scene_fog_shapes_scene_id
  on public.scene_fog_shapes (scene_id);

create index if not exists idx_scene_fog_shapes_campaign_id
  on public.scene_fog_shapes (campaign_id);

-- 3. RLS: jogadores leem apenas da cena ativa; somente GM escreve
grant select, insert, update, delete on public.scene_fog_shapes to authenticated;
grant all on public.scene_fog_shapes to service_role;

alter table public.scene_fog_shapes enable row level security;

drop policy if exists scene_fog_shapes_select on public.scene_fog_shapes;
create policy scene_fog_shapes_select on public.scene_fog_shapes
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and exists (
        select 1 from public.scenes s
        where s.id = scene_fog_shapes.scene_id
          and s.is_active = true
      )
    )
  );

drop policy if exists scene_fog_shapes_insert on public.scene_fog_shapes;
create policy scene_fog_shapes_insert on public.scene_fog_shapes
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scene_fog_shapes_update on public.scene_fog_shapes;
create policy scene_fog_shapes_update on public.scene_fog_shapes
  for update to authenticated
  using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scene_fog_shapes_delete on public.scene_fog_shapes;
create policy scene_fog_shapes_delete on public.scene_fog_shapes
  for delete to authenticated
  using (public.is_campaign_gm(campaign_id));

-- 4. Estende broadcast_campaign_change() para scene_fog_shapes
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

  elsif tg_table_name = 'scene_fog_shapes' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    sid := coalesce(new.scene_id, old.scene_id);
    base_topic := 'campaign:' || cid::text;

    select is_active into scene_active
    from public.scenes
    where id = sid;

    if coalesce(scene_active, false) then
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

drop trigger if exists trg_broadcast_scene_fog_shapes on public.scene_fog_shapes;
create trigger trg_broadcast_scene_fog_shapes
  after insert or update or delete on public.scene_fog_shapes
  for each row execute function public.broadcast_campaign_change();
