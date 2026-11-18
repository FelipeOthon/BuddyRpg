-- ============================================================================
-- 0001_schema.sql â€” Tabelas principais, constraints e Ã­ndices (idempotente)
-- BuddyRPG VTT
-- ============================================================================

-- 1. Perfis de usuÃ¡rios (espelha auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or char_length(username) between 3 and 32),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Campanhas (Mesas)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 80),
  gm_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

-- 3. Membros da Campanha
create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('gm', 'player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- 4. Cenas (Mapas e configuraÃ§Ãµes de grade)
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  map_url text,
  map_width int not null default 2000 check (map_width between 200 and 10000),
  map_height int not null default 2000 check (map_height between 200 and 10000),
  grid_size int not null default 70 check (grid_size between 10 and 300),
  grid_opacity real not null default 0.4 check (grid_opacity between 0 and 1),
  snap_to_grid boolean not null default true,
  meters_per_cell real not null default 1.5 check (meters_per_cell > 0),
  distance_rule text not null default 'chebyshev' check (distance_rule in ('chebyshev', 'euclidean', 'alternating')),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Garante no mÃ¡ximo 1 cena ativa por campanha
create unique index if not exists one_active_scene_per_campaign
  on public.scenes (campaign_id)
  where is_active;

create index if not exists idx_scenes_campaign_id
  on public.scenes (campaign_id);

-- 5. Personagens / Fichas (privadas: dono + GM; player_can_edit controlado pelo GM)
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  sheet_data jsonb not null default '{}'::jsonb,
  player_can_edit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_characters_campaign_id
  on public.characters (campaign_id);

create index if not exists idx_characters_owner_id
  on public.characters (owner_id);

-- 6. Tokens no Tabuleiro
create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  image_url text,
  pos_x double precision not null default 0,
  pos_y double precision not null default 0,
  size smallint not null default 1 check (size between 1 and 4),
  hp_current int not null default 10,
  hp_max int not null default 10 check (hp_max >= 1),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tokens_scene_id
  on public.tokens (scene_id);

create index if not exists idx_tokens_campaign_id
  on public.tokens (campaign_id);

-- 7. Mensagens do Chat e Rolagens de Dados
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  roll_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_campaign_created
  on public.messages (campaign_id, created_at desc);
-- ============================================================================
-- 0002_functions.sql â€” Helpers de RLS, triggers de integridade e RPCs
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Helpers de autorizaÃ§Ã£o (SECURITY DEFINER evita recursÃ£o em RLS)
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

-- 2. Trigger: criar profile automaticamente quando um usuÃ¡rio se cadastra em auth.users
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
--    alteraÃ§Ã£o de campos sensÃ­veis por nÃ£o-GMs
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
    raise exception 'Cena invÃ¡lida para o token';
  end if;

  new.campaign_id := scene_cid;
  new.updated_at := now();

  if tg_op = 'UPDATE' then
    -- Se nÃ£o for GM (e houver um usuÃ¡rio autenticado na sessÃ£o), nÃ£o pode trocar dono nem cena
    if (select auth.uid()) is not null and not public.is_campaign_gm(new.campaign_id) then
      if new.owner_id is distinct from old.owner_id
         or new.scene_id is distinct from old.scene_id
         or new.campaign_id is distinct from old.campaign_id
         or new.character_id is distinct from old.character_id then
        raise exception 'Apenas o Mestre pode alterar vÃ­nculo ou cena do token';
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
      -- Jogador criando a prÃ³pria ficha comeÃ§a sempre com player_can_edit = true e owner_id = auth.uid()
      new.owner_id := (select auth.uid());
      new.player_can_edit := true;
    end if;
  elsif tg_op = 'UPDATE' then
    if (select auth.uid()) is not null and not public.is_campaign_gm(new.campaign_id) then
      if not old.player_can_edit then
        raise exception 'A ediÃ§Ã£o desta ficha estÃ¡ bloqueada pelo Mestre';
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
    raise exception 'UsuÃ¡rio nÃ£o autenticado';
  end if;

  select id into cid
  from public.campaigns
  where upper(invite_code) = upper(trim(code));

  if cid is null then
    raise exception 'CÃ³digo de convite invÃ¡lido';
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
    raise exception 'Cena nÃ£o encontrada';
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

-- 8. RPC: Alternar cadeado de ediÃ§Ã£o da ficha (somente GM)
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
    raise exception 'Ficha nÃ£o encontrada';
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
-- ============================================================================
-- 0003_rls.sql â€” Grants de Schema/Tabelas, PolÃ­ticas de RLS e Backfill de Perfis
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- Garante permissÃµes de tabela/sequÃªncia/funÃ§Ãµes para as roles da API do Supabase
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- Garante que qualquer usuÃ¡rio jÃ¡ existente em auth.users tenha seu registro em public.profiles
insert into public.profiles (id, username, avatar_url)
select
  u.id,
  lower(
    substr(
      regexp_replace(
        coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1), 'user'),
        '[^a-zA-Z0-9_-]',
        '',
        'g'
      ),
      1,
      20
    ) || '_' || substr(replace(u.id::text, '-', ''), 1, 4)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.scenes enable row level security;
alter table public.characters enable row level security;
alter table public.tokens enable row level security;
alter table public.messages enable row level security;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ============================================================================
-- 2. CAMPAIGNS
-- ============================================================================
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select to authenticated
  using (
    gm_id = (select auth.uid())
    or public.is_campaign_member(id)
  );

drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (gm_id = (select auth.uid()));

drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns
  for update to authenticated
  using (public.is_campaign_gm(id))
  with check (public.is_campaign_gm(id));

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (public.is_campaign_gm(id));

-- ============================================================================
-- 3. CAMPAIGN_MEMBERS
-- ============================================================================
drop policy if exists campaign_members_select on public.campaign_members;
create policy campaign_members_select on public.campaign_members
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists campaign_members_insert on public.campaign_members;
create policy campaign_members_insert on public.campaign_members
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_members_update on public.campaign_members;
create policy campaign_members_update on public.campaign_members
  for update to authenticated
  using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_members_delete on public.campaign_members;
create policy campaign_members_delete on public.campaign_members
  for delete to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (user_id = (select auth.uid()) and role <> 'gm')
  );

-- ============================================================================
-- 4. SCENES (Jogadores sÃ³ veem a cena ativa; GM vÃª e gerencia todas)
-- ============================================================================
drop policy if exists scenes_select on public.scenes;
create policy scenes_select on public.scenes
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (public.is_campaign_member(campaign_id) and is_active = true)
  );

drop policy if exists scenes_insert on public.scenes;
create policy scenes_insert on public.scenes
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scenes_update on public.scenes;
create policy scenes_update on public.scenes
  for update to authenticated
  using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists scenes_delete on public.scenes;
create policy scenes_delete on public.scenes
  for delete to authenticated
  using (public.is_campaign_gm(campaign_id));

-- ============================================================================
-- 5. CHARACTERS (Fichas privadas: apenas dono e GM leem; ediÃ§Ã£o controlada por player_can_edit)
-- ============================================================================
drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (public.is_campaign_member(campaign_id) and owner_id = (select auth.uid()))
  );

drop policy if exists characters_insert on public.characters;
create policy characters_insert on public.characters
  for insert to authenticated
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and owner_id = (select auth.uid())
      and player_can_edit = true
    )
  );

drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters
  for update to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and owner_id = (select auth.uid())
      and player_can_edit = true
    )
  )
  with check (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and owner_id = (select auth.uid())
      and player_can_edit = true
    )
  );

drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters
  for delete to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (public.is_campaign_member(campaign_id) and owner_id = (select auth.uid()))
  );

-- ============================================================================
-- 6. TOKENS (Jogadores veem apenas tokens da cena ativa; movem/editam os seus)
-- ============================================================================
drop policy if exists tokens_select on public.tokens;
create policy tokens_select on public.tokens
  for select to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (
      public.is_campaign_member(campaign_id)
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_active = true
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
          and s.is_active = true
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
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_active = true
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
      and exists (
        select 1 from public.scenes s
        where s.id = tokens.scene_id
          and s.is_active = true
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

drop policy if exists tokens_delete on public.tokens;
create policy tokens_delete on public.tokens
  for delete to authenticated
  using (
    public.is_campaign_gm(campaign_id)
    or (public.is_campaign_member(campaign_id) and owner_id = (select auth.uid()))
  );

-- ============================================================================
-- 7. MESSAGES (Leitura para membros; roll_result bloqueado para clientes via RLS)
-- ============================================================================
-- Nota: mantemos GRANT na tabela para authenticated e bloqueamos roll_result != null na policy messages_insert
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.is_campaign_member(campaign_id)
    and user_id = (select auth.uid())
    and roll_result is null
  );

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated
  using (public.is_campaign_gm(campaign_id));
-- ============================================================================
-- 0004_realtime.sql â€” Triggers de Broadcast from Database e RLS de canais privados
-- BuddyRPG VTT (idempotente)
-- ============================================================================
-- TÃ³picos de Realtime utilizados:
--   campaign:<campaign_id>                -> Membros (cena ativa, tokens ativos, mensagens, drag/rÃ©gua)
--   campaign:<campaign_id>:gm             -> Apenas Mestre (cenas inativas, tokens inativos, todas as fichas)
--   campaign:<campaign_id>:user:<user_id> -> Apenas o prÃ³prio jogador (atualizaÃ§Ãµes da sua ficha privada)

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
    -- Fichas sÃ£o privadas: envia para o canal do GM e para o canal privado do dono
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
-- PolÃ­ticas de RLS em realtime.messages (Canais Privados)
-- Nota: realtime.messages jÃ¡ vem com RLS ativado pelo Supabase Cloud
-- ============================================================================

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
-- ============================================================================
-- 0005_storage.sql â€” Buckets de Storage (maps, tokens) e PolÃ­ticas RLS
-- BuddyRPG VTT (idempotente)
-- ConvenÃ§Ã£o de caminho: <campaign_id>/<uuid>.<ext>
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
-- PolÃ­ticas para o bucket 'maps' (Somente GM faz upload/atualiza/remove)
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
-- PolÃ­ticas para o bucket 'tokens' (Membros da campanha fazem upload; dono ou GM remove)
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
