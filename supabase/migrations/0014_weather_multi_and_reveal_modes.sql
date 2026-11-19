-- ============================================================================
-- 0014_weather_multi_and_reveal_modes.sql
-- Multi-clima simultâneo (inclui Anoitecer/nightfall) + Modalidade de
-- revelação da Névoa (F) e Escuridão (E): 'trail' (some de vez) | 'vision' (raio de visão)
-- BuddyRPG VTT (idempotente)
-- ============================================================================

-- 1. Remove restrição antiga de weather_preset único para permitir 'nightfall'
-- e combinações múltiplas separadas por vírgula (ex.: 'rain,fog_mist,nightfall').
do $$
declare
  c_name text;
begin
  for c_name in
    select conname
    from pg_constraint
    where conrelid = 'public.scenes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%weather_preset%'
  loop
    execute format('alter table public.scenes drop constraint if exists %I', c_name);
  end loop;
end $$;

alter table public.scenes
  add constraint scenes_weather_preset_format_check
  check (
    weather_preset = 'none'
    or weather_preset ~ '^(rain|snow|fog_mist|embers|ash|nightfall)(,(rain|snow|fog_mist|embers|ash|nightfall))*$'
  );

-- 2. Modalidade de revelação para Névoa de Guerra (F) e Escuridão (E)
-- 'trail'  = Quando o token passa, a área revelada permanece descoberta (some de vez)
-- 'vision' = O mapa só aparece dentro do raio de visão/luz atual do token
alter table public.scenes
  add column if not exists fog_reveal_mode text not null default 'trail'
    check (fog_reveal_mode in ('trail', 'vision')),
  add column if not exists darkness_reveal_mode text not null default 'vision'
    check (darkness_reveal_mode in ('trail', 'vision'));
