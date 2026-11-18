-- ============================================================================
-- 0007_token_visibility_conditions.sql — Tokens ocultos (GM) e Condições
-- BuddyRPG VTT (idempotente)
-- ============================================================================

alter table public.tokens
  add column if not exists is_hidden boolean not null default false,
  add column if not exists conditions text[] not null default '{}';

-- Atualiza política de leitura de tokens: jogadores não veem tokens ocultos
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
          and s.is_active = true
      )
    )
  );

-- Atualiza trigger de broadcast para não vazar tokens ocultos no canal público
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
  token_hidden boolean := false;
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

    token_hidden := coalesce(new.is_hidden, false) and coalesce(old.is_hidden, true);

    if coalesce(scene_active, false) and not token_hidden then
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
