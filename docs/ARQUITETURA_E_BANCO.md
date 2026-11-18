# Arquitetura e Modelagem do Banco de Dados — BuddyRPG

Este documento descreve a arquitetura técnica, o modelo de segurança (Row Level Security), a topologia de canais Realtime e o armazenamento de arquivos do **BuddyRPG**.

---

## 1. Visão Geral da Stack

| Camada | Tecnologia | Papel no Sistema |
|---|---|---|
| Framework Web | Next.js 16.4 (App Router, Turbopack, Cache Components) | Rotas, Server Components, Server Actions e Proxy de sessão (`src/proxy.ts`) |
| Tabuleiro Interativo | `react-konva` 19 + `konva` 10 | Renderização HTML5 Canvas no cliente (`ssr: false`) com camadas de Mapa, Grade, Tokens e Régua |
| Estado Cliente | Zustand (`boardStore`) | Fonte única de verdade no cliente para cena ativa, tokens, viewport (zoom/pan) e ferramenta |
| Banco & Auth | Supabase (PostgreSQL + Auth) | Persistência relacional + JSONB, autenticação JWT via cookies HTTP-only (`@supabase/ssr`) |
| Tempo Real | Supabase Realtime (Broadcast + Broadcast from Database) | Sincronização instantânea via WebSockets em canais privados autorizados por RLS |
| Imagens | Supabase Storage | Buckets `maps` (até 10 MB) e `tokens` (até 2 MB) com controle de escrita por campanha |

---

## 2. Modelagem do Banco de Dados

Definida em [0001_schema.sql](../supabase/migrations/0001_schema.sql) e [0002_functions.sql](../supabase/migrations/0002_functions.sql):

1. **`profiles`**: Criada automaticamente por trigger (`handle_new_user`) quando um usuário se registra em `auth.users`.
2. **`campaigns`**: Representa uma mesa de RPG. Ao ser criada, o trigger `handle_new_campaign` registra automaticamente o criador como `'gm'` em `campaign_members` e cria a primeira cena ativa (`Cena Principal`).
3. **`campaign_members`**: Relaciona usuários e campanhas com `role in ('gm', 'player')`. Jogadores entram usando a RPC `join_campaign(code)`.
4. **`scenes`**: Cada cena contém o mapa (`map_url`, `map_width`, `map_height`), configuração da grade (`grid_size`, `grid_opacity`, `snap_to_grid`, `meters_per_cell`, `distance_rule`) e flag `is_active` (com índice único parcial garantindo apenas 1 cena ativa por campanha).
5. **`characters`**: Fichas com `sheet_data JSONB` flexível e coluna `player_can_edit boolean default true`.
   - **Privacidade:** Apenas o dono (`owner_id`) e o Mestre (`gm`) conseguem ler a ficha.
   - **Cadeado do Mestre (`🔒`):** O Mestre pode bloquear ou liberar a edição da ficha a qualquer momento via RPC `set_character_edit_lock(character_id, can_edit)`.
6. **`tokens`**: Posição em pixels do mundo (`pos_x`, `pos_y`), tamanho em células (`1` a `4`), HP (`hp_current`, `hp_max`) e vínculo opcional com `character_id`. O trigger `tokens_before_write` sincroniza `campaign_id` automaticamente a partir de `scene_id` e impede que jogadores troquem o dono ou a cena do token.
7. **`messages`**: Histórico de chat e rolagens (`roll_result JSONB`). A coluna `roll_result` tem permissão `INSERT/UPDATE` revogada para clientes (`anon`, `authenticated`), podendo ser gravada exclusivamente no servidor via `SUPABASE_SECRET_KEY`.

---

## 3. Matriz de Permissões (RLS)

Implementada em [0003_rls.sql](../supabase/migrations/0003_rls.sql):

| Tabela | Leitura (`SELECT`) | Criação (`INSERT`) | Edição (`UPDATE`) | Exclusão (`DELETE`) |
|---|---|---|---|---|
| `profiles` | Autenticados | Próprio usuário / Trigger | Próprio usuário | Cascade |
| `campaigns` | Membros e GM | Autenticado (`gm_id = uid`) | Somente GM | Somente GM |
| `campaign_members` | Membros da campanha | GM ou RPC `join_campaign` | Somente GM | GM ou o próprio jogador (sair) |
| `scenes` | **GM:** todas · **Jogador:** apenas `is_active = true` | Somente GM | Somente GM | Somente GM |
| `characters` | **Privada:** somente dono da ficha ou GM | GM ou jogador (`owner_id = uid`) | GM sempre; dono somente se `player_can_edit = true` | Dono ou GM |
| `tokens` | **GM:** todos · **Jogador:** apenas tokens da cena ativa | GM ou jogador na cena ativa (`owner_id = uid`) | GM, dono do token ou dono da ficha vinculada (na cena ativa) | Dono ou GM |
| `messages` | Membros da campanha | Membros (`roll_result is null`) ou Server Action (`service_role`) | Bloqueado | Somente GM |

---

## 4. Topologia de Canais Realtime Privados

Configurada em [0004_realtime.sql](../supabase/migrations/0004_realtime.sql) sobre a tabela `realtime.messages`:

- **`campaign:<campaign_id>`** *(Membros da campanha)*:
  - Eventos efêmeros de cliente (`token:drag`, `ruler:move`).
  - Eventos de banco (`realtime.broadcast_changes`) para `messages`, `scenes` ativas e `tokens` da cena ativa.
- **`campaign:<campaign_id>:gm`** *(Exclusivo do Mestre)*:
  - Eventos de banco para cenas inativas (preparação secreta do Mestre), tokens de cenas inativas e todas as fichas (`characters`).
- **`campaign:<campaign_id>:user:<user_id>`** *(Exclusivo do próprio jogador)*:
  - Eventos de banco para as fichas privadas (`characters`) pertencentes àquele jogador (ex.: quando o Mestre altera o cadeado `player_can_edit` ou edita a ficha dele).
