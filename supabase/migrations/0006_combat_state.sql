-- ============================================================================
-- 0006_combat_state.sql — Persistência do Rastreador de Iniciativa por Cena
-- BuddyRPG VTT (idempotente)
-- ============================================================================

alter table public.scenes
  add column if not exists combat_state jsonb;
