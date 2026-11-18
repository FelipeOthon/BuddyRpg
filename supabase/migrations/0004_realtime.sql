-- ============================================================================
-- 0004_realtime.sql — Triggers de Broadcast from Database e RLS de canais privados
-- BuddyRPG VTT (idempotente)
-- ============================================================================
-- Tópicos de Realtime utilizados:
--   campaign:<campaign_id>                -> Membros (cena ativa, tokens ativos, mensagens, drag/régua)
--   campaign:<campaign_id>:gm             -> Apenas Mestre (cenas inativas, tokens inativos, todas as fichas)
--   campaign:<campaign_id>:user:<user_id> -> Apenas o próprio jogador (atualizações da sua ficha privada)

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
    -- Fichas são privadas: envia para o canal do GM e para o canal privado do dono
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

drop trigger if exists trg_broadcast_scenes on public.scenes;
create trigger trg_broadcast_scenes
  after insert or update or delete on public.scenes
  for each row execute function public.broadcast_campaign_change();

drop trigger if exists trg_broadcast_tokens on public.tokens;
create trigger trg_broadcast_tokens
  after insert or update or delete on public.tokens
  for each row execute function public.broadcast_campaign_change();

drop trigger if exists trg_broadcast_characters on public.characters;
create trigger trg_broadcast_characters
  after insert or update or delete on public.characters
  for each row execute function public.broadcast_campaign_change();

drop trigger if exists trg_broadcast_messages on public.messages;
create trigger trg_broadcast_messages
  after insert or update or delete on public.messages
  for each row execute function public.broadcast_campaign_change();

-- ============================================================================
-- Políticas de RLS em realtime.messages (Canais Privados)
-- ============================================================================
alter table realtime.messages enable row level security;

drop policy if exists "realtime_campaign_read" on realtime.messages;
create policy "realtime_campaign_read"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      -- Canal geral da campanha: qualquer membro
      (
        realtime.topic() ~ '^campaign:[0-9a-fA-F-]{36}$'
        and public.is_campaign_member(split_part(realtime.topic(), ':', 2)::uuid)
      )
      -- Canal exclusivo do Mestre
      or (
        realtime.topic() ~ '^campaign:[0-9a-fA-F-]{36}:gm$'
        and public.is_campaign_gm(split_part(realtime.topic(), ':', 2)::uuid)
      )
      -- Canal privado de fichas do jogador
      or (
        realtime.topic() ~ '^campaign:[0-9a-fA-F-]{36}:user:[0-9a-fA-F-]{36}$'
        and public.is_campaign_member(split_part(realtime.topic(), ':', 2)::uuid)
        and split_part(realtime.topic(), ':', 4)::uuid = (select auth.uid())
      )
    )
  );

drop policy if exists "realtime_campaign_send" on realtime.messages;
create policy "realtime_campaign_send"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^campaign:[0-9a-fA-F-]{36}$'
    and public.is_campaign_member(split_part(realtime.topic(), ':', 2)::uuid)
  );
