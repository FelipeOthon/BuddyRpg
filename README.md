# BuddyRPG — Virtual Tabletop Minimalista & em Tempo Real

VTT minimalista e imersivo construído com **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **react-konva 19** e **Supabase** (PostgreSQL + Auth + Realtime + Storage), preparado para hospedagem gratuita no **Render**.

---

## 📜 A Origem & História do Projeto

O **BuddyRPG** não nasceu do zero; ele é fruto de uma jornada colaborativa para solucionar dores reais da comunidade de RPG de mesa:

1. **[PeerBuddy](https://github.com/VazFabricio/PeerBuddy) (por [Fabrício Vaz](https://github.com/VazFabricio))**:
   - O projeto teve início localmente pelas mãos de **[Fabrício Vaz](https://github.com/VazFabricio)**, motivado pela necessidade de eliminar o incômodo e a distração de ter que compartilhar telas o tempo todo entre amigos durante as sessões de RPG. O PeerBuddy nasceu como uma ponte direta de sincronização entre visões de jogo.

2. **[PeerBuddyRpg](https://github.com/FelipeOthon/PeerBuddyRpg) (por [Felipe Othon Santiago](https://github.com/FelipeOthon))**:
   - Notando um gargalo crescente e o grande vácuo que os bloqueios e instabilidades do Discord no Brasil deixaram para os grupos de RPG, **[Felipe Othon Santiago](https://github.com/FelipeOthon)** viu a urgência de acolher e reunir a comunidade, integrando em um só espaço as ferramentas fundamentais de mesa, dados e controle tático.

3. **[BuddyRpg](https://github.com/FelipeOthon/BuddyRpg) (A Grande Base Online)**:
   - Para garantir que ninguém precisasse instalar dependências complexas ou configurar portas de rede, **[Felipe Othon Santiago](https://github.com/FelipeOthon)** projetou toda a base online e aberta no navegador: nasce o **BuddyRPG**. Um tabuleiro virtual completo com física realista de dados 3D, névoa e escuridão dinâmicas com tochas, forja procedural de masmorras, fichas sincronizadas com suporte a D&D 5e e biblioteca de tokens e mapas.

> ⚔️ **Criado com paixão por [Felipe Othon Santiago](https://github.com/FelipeOthon) e [Fabrício Vaz](https://github.com/VazFabricio) — Software livre, de mestre para jogador.**

---

## 📚 Documentação Completa (`/docs`)

Toda a documentação e os tutoriais do projeto ficam salvos na pasta [`docs/`](./docs):

- 📖 **[Manual de Instalação e Deploy (Supabase + Render)](./docs/MANUAL_INSTALACAO.md)** — Passo a passo completo do zero para configurar o Supabase, rodar as migrations SQL, validar o RLS e publicar no Render.
- 🏗️ **[Arquitetura, Banco de Dados, RLS e Realtime](./docs/ARQUITETURA_E_BANCO.md)** — Explicação detalhada das tabelas, matriz de permissões RLS, canais privados Realtime e Storage Buckets.
- 🎲 **[Guia de Uso (Mestre e Jogadores)](./docs/GUIA_DE_USO.md)** — Como criar mesas, convidar jogadores, usar o tabuleiro, rolar dados no chat e gerenciar fichas privadas com cadeado do Mestre.

---

## 🚀 Scripts Locais

```bash
npm run dev      # Servidor de desenvolvimento em http://localhost:3000
npm run lint     # ESLint
npm run test     # Vitest (testes unitários)
npm run build    # Build de produção
npm run start    # Inicia servidor de produção (lê $PORT automaticamente)
```
