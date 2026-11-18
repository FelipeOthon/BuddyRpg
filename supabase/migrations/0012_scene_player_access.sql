-- ============================================================================
-- 0012_scene_player_access.sql — Liberação granular de cenas para jogadores
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Coluna is_player_visible: permite ao Mestre liberar/bloquear múltiplas cenas
alter table public.scenes
  add column if not exists is_player_visible boolean not null default false;

-- Garante que cenas já ativas fiquem liberadas para os jogadores
update public.scenes
set is_player_visible = true
where is_active = true
  and is_player_visible = false;

-- 2. Trigger de nova campanha: cena inicial já nasce ativa e liberada
create or replace function public.handle_new_campaign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.campaign_members (campaign_id, user_id, role)
  values (new.id, new.gm_id, 'gm')
  on conflict (campaign_id, user_id) do update set role = 'gm';

  insert into public.scenes (campaign_id, name, is_active, is_player_visible)
  values (new.id, 'Cena Principal', true, true);

  return new;
end;
$$;

-- 3. RPC set_active_scene: ao ativar/puxar para uma cena, também a libera aos jogadores
create or replace function public.set_active_scene(target_scene_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  select campaign_id into cid
  from public.scenes
  where id = target_scene_id;

  if cid is null then
    raise exception 'Cena não encontrada';
  end if;

  if not public.is_campaign_gm(cid) then
    raise exception 'Apenas o Mestre pode ativar cenas';
  end if;

  update public.scenes
  set is_active = false
  where campaign_id = cid
    and is_active = true
    and id <> target_scene_id;

  update public.scenes
  set is_active = true,
      is_player_visible = true
  where id = target_scene_id;
end;
$$;

-- 4. RPC set_scene_player_visibility: Mestre decide se cada cena está liberada ou secreta
create or replace function public.set_scene_player_visibility(
  target_scene_id uuid,
  visible boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  select campaign_id into cid
  from public.scenes
  where id = target_scene_id;

  if cid is null then
    raise exception 'Cena não encontrada';
  end if;

  if not public.is_campaign_gm(cid) then
    raise exception 'Apenas o Mestre pode liberar ou bloquear cenas';
  end if;

  update public.scenes
  set is_player_visible = visible,
      is_active = case when visible = false then false else is_active end
  where id = target_scene_id;
end;
$$;

-- 5. Atualiza políticas RLS para respeitar is_player_visible = true
drop policy if exists scenes_select on public.scenes;
create policy scenes_select on public.scenes
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (public.is_campaign_member(campaign_id) and is_player_visible = true)
  );

drop policy if exists tokens_select on public.tokens;
create policy tokens_select on public.tokens
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and is_hidden = false
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_player_visible = true
      )
    )
  );

drop policy if exists tokens_insert on public.tokens;
create policy tokens_insert on public.tokens
  for insert to authenticated
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and owner_id = (select auth.uid())
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_player_visible = true
      )
    )
  );

drop policy if exists tokens_update on public.tokens;
create policy tokens_update on public.tokens
  for update to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and is_locked = false
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_player_visible = true
      )
      and (
        owner_id = (select auth.uid())
        or exists (
          select 1 from public.characters c
          where c.id = tokens.character_id
            and c.owner_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and is_locked = false
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_player_visible = true
      )
      and (
        owner_id = (select auth.uid())
        or exists (
          select 1 from public.characters c
          where c.id = tokens.character_id
            and c.owner_id = (select auth.uid())
        )
      )
    )
  );

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
          and s.is_player_visible = true
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
          and s.is_player_visible = true
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
          and s.is_player_visible = true
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
          and s.is_player_visible = true
      )
    )
  );

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
          and s.is_player_visible = true
      )
    )
  );

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
          and s.is_player_visible = true
      )
    )
  );

-- 6. Atualiza broadcast_campaign_change() para usar is_player_visible
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
  scene_visible boolean := false;
  item_hidden boolean := false;
  base_topic text;
begin
  if tg_table_name = 'scenes' then
    cid := coalesce(new.campaign_id, old.campaign_id);
    scene_visible :=
      coalesce(new.is_player_visible, false)
      or coalesce(old.is_player_visible, false);
    base_topic := 'campaign:' || cid::text;

    if scene_visible then
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

    select is_player_visible into scene_visible
    from public.scenes
    where id = sid;

    item_hidden := coalesce(new.is_hidden, false) and coalesce(old.is_hidden, true);

    if coalesce(scene_visible, false) and not item_hidden then
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

    select is_player_visible into scene_visible
    from public.scenes
    where id = sid;

    item_hidden := coalesce(new.is_hidden, false) and coalesce(old.is_hidden, true);

    if coalesce(scene_visible, false) and not item_hidden then
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

    select is_player_visible into scene_visible
    from public.scenes
    where id = sid;

    if coalesce(scene_visible, false) then
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
