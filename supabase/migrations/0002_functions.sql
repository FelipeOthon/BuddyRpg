-- ============================================================================
-- 0002_functions.sql — Helpers de RLS, triggers de integridade e RPCs
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Helpers de autorização (SECURITY DEFINER evita recursão em RLS)
create or replace function public.is_campaign_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members
    where campaign_id = cid
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_campaign_gm(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members
    where campaign_id = cid
      and user_id = (select auth.uid())
      and role = 'gm'
  );
$$;

-- 2. Trigger: criar profile automaticamente quando um usuário se cadastra em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_username text;
  final_username text;
begin
  raw_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );
  raw_username := regexp_replace( coalesce(raw_username, 'aventureiro'), '[^a-zA-Z0-9_-]', '', 'g');
  if char_length(raw_username) < 3 then
    raw_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 6);
  else
    raw_username := substr(raw_username, 1, 24) || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  final_username := lower(raw_username);

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Trigger: ao criar uma campanha, adicionar automaticamente o GM em campaign_members
--    e criar uma cena inicial ativa
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

  insert into public.scenes (campaign_id, name, is_active)
  values (new.id, 'Cena Principal', true);

  return new;
end;
$$;

drop trigger if exists on_campaign_created on public.campaigns;
create trigger on_campaign_created
  after insert on public.campaigns
  for each row execute function public.handle_new_campaign();

-- 4. Trigger: sincronizar campaign_id do token a partir de scene_id e bloquear
--    alteração de campos sensíveis por não-GMs
create or replace function public.tokens_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scene_cid uuid;
begin
  select campaign_id into scene_cid
  from public.scenes
  where id = new.scene_id;

  if scene_cid is null then
    raise exception 'Cena inválida para o token';
  end if;

  new.campaign_id := scene_cid;
  new.updated_at := now();

  if tg_op = 'UPDATE' then
    -- Se não for GM (e houver um usuário autenticado na sessão), não pode trocar dono nem cena
    if (select auth.uid()) is not null and not public.is_campaign_gm(new.campaign_id) then
      if new.owner_id is distinct from old.owner_id
         or new.scene_id is distinct from old.scene_id
         or new.campaign_id is distinct from old.campaign_id
         or new.character_id is distinct from old.character_id then
        raise exception 'Apenas o Mestre pode alterar vínculo ou cena do token';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tokens_before_write on public.tokens;
create trigger trg_tokens_before_write
  before insert or update on public.tokens
  for each row execute function public.tokens_before_write();

-- 5. Trigger: proteger campos administrativos de characters (player_can_edit, owner_id, campaign_id)
create or replace function public.characters_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and not public.is_campaign_gm(new.campaign_id) then
      -- Jogador criando a própria ficha começa sempre com player_can_edit = true e owner_id = auth.uid()
      new.owner_id := (select auth.uid());
      new.player_can_edit := true;
    end if;
  elsif tg_op = 'UPDATE' then
    if (select auth.uid()) is not null and not public.is_campaign_gm(new.campaign_id) then
      if not old.player_can_edit then
        raise exception 'A edição desta ficha está bloqueada pelo Mestre';
      end if;
      if new.player_can_edit is distinct from old.player_can_edit
         or new.owner_id is distinct from old.owner_id
         or new.campaign_id is distinct from old.campaign_id then
        raise exception 'Apenas o Mestre pode alterar o bloqueio ou dono da ficha';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_characters_before_write on public.characters;
create trigger trg_characters_before_write
  before insert or update on public.characters
  for each row execute function public.characters_before_write();

-- 6. RPC: Entrar em campanha via invite_code sem precisar de SELECT aberto em campaigns
create or replace function public.join_campaign(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cid uuid;
begin
  if uid is null then
    raise exception 'Usuário não autenticado';
  end if;

  select id into cid
  from public.campaigns
  where upper(invite_code) = upper(trim(code));

  if cid is null then
    raise exception 'Código de convite inválido';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (cid, uid, 'player')
  on conflict (campaign_id, user_id) do nothing;

  return cid;
end;
$$;

-- 7. RPC: Ativar cena atomicamente (somente GM)
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
  set is_active = true
  where id = target_scene_id
    and is_active = false;
end;
$$;

-- 8. RPC: Alternar cadeado de edição da ficha (somente GM)
create or replace function public.set_character_edit_lock(
  target_character_id uuid,
  can_edit boolean
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
  from public.characters
  where id = target_character_id;

  if cid is null then
    raise exception 'Ficha não encontrada';
  end if;

  if not public.is_campaign_gm(cid) then
    raise exception 'Apenas o Mestre pode liberar ou bloquear fichas';
  end if;

  update public.characters
  set player_can_edit = can_edit,
      updated_at = now()
  where id = target_character_id;
end;
$$;
