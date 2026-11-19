-- ============================================================================
-- 0015_trail_epochs.sql
-- "Época" do rastro de exploração da Névoa (F) e Escuridão (E).
-- Quando o Mestre reseta o rastro, a época sobe e TODOS os clientes (inclusive
-- após recarregar a página) descartam o rastro antigo guardado localmente.
-- BuddyRPG VTT (idempotente)
-- ============================================================================

alter table public.scenes
  add column if not exists fog_trail_epoch integer not null default 0,
  add column if not exists darkness_trail_epoch integer not null default 0;
