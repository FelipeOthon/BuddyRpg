-- ============================================================================
-- 0001_schema.sql — Tabelas principais, constraints e índices (idempotente)
-- BuddyRPG VTT
-- ============================================================================

-- 1. Perfis de usuários (espelha auth.users)
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

-- 4. Cenas (Mapas e configurações de grade)
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

-- Garante no máximo 1 cena ativa por campanha
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
