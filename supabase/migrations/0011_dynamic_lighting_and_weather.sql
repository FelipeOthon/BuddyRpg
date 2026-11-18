-- ============================================================================
-- 0011_dynamic_lighting_and_weather.sql — Iluminação Dinâmica, Paredes/Portas e Clima/VFX
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Ambiente e Clima na cena
alter table public.scenes
  add column if not exists ambient_light real not null default 1.0
    check (ambient_light between 0 and 1),
  add column if not exists weather_preset text not null default 'none'
    check (weather_preset in ('none', 'rain', 'snow', 'fog_mist', 'embers', 'ash')),
  add column if not exists weather_intensity real not null default 0.5
    check (weather_intensity between 0 and 1);

-- 2. Visão e Luz nos tokens
alter table public.tokens
  add column if not exists vision_range real not null default 18,
  add column if not exists light_radius real not null default 0,
  add column if not exists light_color text not null default '#fbbf24';

-- 3. Paredes, Portas e Janelas da cena
create table if not exists public.scene_walls (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  x1 double precision not null,
  y1 double precision not null,
  x2 double precision not null,
  y2 double precision not null,
  wall_type text not null default 'wall'
    check (wall_type in ('wall', 'door', 'window')),
  is_open boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_scene_walls_scene_id
  on public.scene_walls (scene_id);

create index if not exists idx_scene_walls_campaign_id
  on public.scene_walls (campaign_id);

-- 4. RLS: membros leem paredes da cena ativa; somente GM cria/edita/exclui
grant select, insert, update, delete on public.scene_walls to authenticated;
grant all on public.scene_walls to service_role;

alter table public.scene_walls enable row level security;

drop policy if exists scene_walls_select on public.scene_walls;
create policy scene_walls_select on public.scene_walls
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and exists (
        select 1 from public.scenes s
        where s.id = scene_walls.scene_id
          and s.is_active = true
      )
    )
  );

drop policy if exists scene_walls_insert on public.scene_walls;
create policy scene_walls_insert on public.scene_walls
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scene_walls_update on public.scene_walls;
create policy scene_walls_update on public.scene_walls
  for update to authenticated
  using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scene_walls_delete on public.scene_walls;
create policy scene_walls_delete on public.scene_walls
  for delete to authenticated
  using (public.is_campaign_gm(campaign_id));

-- 5. Estende broadcast_campaign_change() para scene_walls
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

  elsif tg_table_name = 'scene_fog_shapes' or tg_table_name = 'scene_walls' then
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

drop trigger if exists trg_broadcast_scene_walls on public.scene_walls;
create trigger trg_broadcast_scene_walls
  after insert or update or delete on public.scene_walls
  for each row execute function public.broadcast_campaign_change();
