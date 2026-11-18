-- ============================================================================
-- 0003_rls.sql — Grants de Schema/Tabelas, Políticas de RLS e Backfill de Perfis
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- Garante permissões de tabela/sequência/funções para as roles da API do Supabase
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- Garante que qualquer usuário já existente em auth.users tenha seu registro em public.profiles
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
-- 4. SCENES (Jogadores só veem a cena ativa; GM vê e gerencia todas)
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
-- 5. CHARACTERS (Fichas privadas: apenas dono e GM leem; edição controlada por player_can_edit)
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
