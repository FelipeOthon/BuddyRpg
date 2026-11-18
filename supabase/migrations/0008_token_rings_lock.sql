-- ============================================================================
-- 0008_token_rings_lock.sql — Anéis coloridos e trava de token (Lock)
-- BuddyRPG VTT (idempotente)
-- ============================================================================

alter table public.tokens
  add column if not exists ring_color text,
  add column if not exists is_locked boolean not null default false;

-- Jogadores não podem mover/editar tokens travados (is_locked = true)
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
      and is_locked = false
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
