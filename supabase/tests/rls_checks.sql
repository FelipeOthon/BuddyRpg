-- ============================================================================
-- supabase/tests/rls_checks.sql
-- Script de verificação automatizada de RLS, Triggers e RPCs (transacional: faz ROLLBACK no final)
-- Cole e execute no SQL Editor do Supabase após rodar as migrations 0001..0005.
-- ============================================================================

begin;

do $$
declare
  gm_uid uuid := '00000000-0000-0000-0000-000000000001';
  p1_uid uuid := '00000000-0000-0000-0000-000000000002';
  p2_uid uuid := '00000000-0000-0000-0000-000000000003';
  cid uuid;
  inv_code text;
  active_scene_id uuid;
  secret_scene_id uuid;
  p1_char_id uuid;
  p1_token_id uuid;
  gm_token_id uuid;
  cnt int;
  updated_rows int;
begin
  -- 1. Cria 3 usuários de teste em auth.users (dispara trigger handle_new_user -> profiles)
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (gm_uid, 'gm_test@buddyrpg.local', '{"username":"mestre_teste"}'::jsonb),
    (p1_uid, 'p1_test@buddyrpg.local', '{"username":"jogador_um"}'::jsonb),
    (p2_uid, 'p2_test@buddyrpg.local', '{"username":"jogador_dois"}'::jsonb);

  -- 2. Simula sessão do GM criando uma campanha
  perform set_config('request.jwt.claim.sub', gm_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', gm_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.campaigns (title, gm_id)
  values ('Campanha de Teste RLS', gm_uid)
  returning id, invite_code into cid, inv_code;

  -- Verifica se o trigger criou a Cena Principal ativa
  select id into active_scene_id
  from public.scenes
  where campaign_id = cid and is_active = true;

  if active_scene_id is null then
    raise exception 'FALHA: Trigger handle_new_campaign não criou a cena ativa inicial';
  end if;

  -- GM cria uma cena secreta (is_active = false) e um token do GM na cena ativa
  insert into public.scenes (campaign_id, name, is_active)
  values (cid, 'Masmo Secreta do Mestre', false)
  returning id into secret_scene_id;

  insert into public.tokens (scene_id, campaign_id, owner_id, name, pos_x, pos_y)
  values (active_scene_id, cid, gm_uid, 'Dragão Vermelho', 140, 140)
  returning id into gm_token_id;

  -- 3. Simula Jogador 1 antes de entrar na campanha: NÃO pode ver a campanha
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p1_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p1_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.campaigns where id = cid;
  if cnt <> 0 then
    raise exception 'FALHA RLS: Jogador fora da campanha conseguiu ler a campanha';
  end if;

  -- Jogador 1 entra via RPC join_campaign
  perform public.join_campaign(inv_code);

  -- Jogador 2 também entra na campanha
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p2_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p2_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.join_campaign(inv_code);

  -- 4. Volta para Jogador 1: deve ver apenas a cena ativa (não vê a cena secreta do GM)
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p1_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p1_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.scenes where campaign_id = cid;
  if cnt <> 1 then
    raise exception 'FALHA RLS: Jogador deveria ver exatamente 1 cena (ativa), mas viu %', cnt;
  end if;

  -- 5. Jogador 1 cria sua ficha e seu token
  insert into public.characters (campaign_id, owner_id, name, sheet_data)
  values (cid, p1_uid, 'Thorin', '{"level": 1}'::jsonb)
  returning id into p1_char_id;

  insert into public.tokens (scene_id, campaign_id, owner_id, character_id, name, pos_x, pos_y)
  values (active_scene_id, cid, p1_uid, p1_char_id, 'Thorin Token', 70, 70)
  returning id into p1_token_id;

  -- Jogador 1 move o próprio token (deve funcionar)
  update public.tokens set pos_x = 210, pos_y = 210 where id = p1_token_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'FALHA RLS: Jogador 1 não conseguiu mover o próprio token';
  end if;

  -- Jogador 1 tenta mover o token do GM (deve atualizar 0 linhas por RLS)
  update public.tokens set pos_x = 999 where id = gm_token_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 0 then
    raise exception 'FALHA RLS: Jogador 1 conseguiu mover o token do Mestre!';
  end if;

  -- 6. Simula Jogador 2: NÃO pode ver a ficha privada do Jogador 1
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p2_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p2_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.characters where id = p1_char_id;
  if cnt <> 0 then
    raise exception 'FALHA RLS: Jogador 2 conseguiu ler a ficha privada do Jogador 1!';
  end if;

  -- 7. GM bloqueia a ficha do Jogador 1 (player_can_edit = false)
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', gm_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', gm_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  perform public.set_character_edit_lock(p1_char_id, false);

  -- 8. Jogador 1 tenta editar a própria ficha bloqueada (deve atualizar 0 linhas)
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p1_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p1_uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  update public.characters set sheet_data = '{"level": 99}'::jsonb where id = p1_char_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 0 then
    raise exception 'FALHA RLS: Jogador 1 editou ficha bloqueada pelo Mestre!';
  end if;

  -- 9. Jogador 1 tenta forjar roll_result diretamente em messages (deve falhar por permissão de coluna)
  begin
    execute 'insert into public.messages (campaign_id, user_id, content, roll_result) values ($1, $2, ''/r 1d20'', ''{"total":20}''::jsonb)'
      using cid, p1_uid;
    raise exception 'FALHA DE SEGURANÇA: Cliente autenticado conseguiu gravar roll_result diretamente!';
  exception
    when insufficient_privilege then
      -- Esperado! A coluna roll_result tem INSERT revogado para authenticated.
      null;
  end;

  raise notice 'SUCESSO: Todos os testes de RLS, fichas privadas, cadeado do Mestre, cenas secretas e proteção de roll_result passaram!';
end;
$$;

rollback;
