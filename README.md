# BuddyRPG — Virtual Tabletop Minimalista

VTT minimalista em tempo real construído com **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **react-konva 19** e **Supabase** (PostgreSQL + Auth + Realtime + Storage), preparado para hospedagem gratuita no **Render**.

## 📚 Documentação Completa (`/docs`)

Toda a documentação e os tutoriais do projeto ficam salvos na pasta [`docs/`](./docs):

- 📖 **[Manual de Instalação e Deploy (Supabase + Render)](./docs/MANUAL_INSTALACAO.md)** — Passo a passo completo do zero para configurar o Supabase, rodar as migrations SQL, validar o RLS e publicar no Render.
- 🏗️ **[Arquitetura, Banco de Dados, RLS e Realtime](./docs/ARQUITETURA_E_BANCO.md)** — Explicação detalhada das tabelas, matriz de permissões RLS, canais privados Realtime e Storage Buckets.
- 🎲 **[Guia de Uso (Mestre e Jogadores)](./docs/GUIA_DE_USO.md)** — Como criar mesas, convidar jogadores, usar o tabuleiro, rolar dados no chat e gerenciar fichas privadas com cadeado do Mestre.

## Scripts Locais

```bash
npm run dev      # Servidor de desenvolvimento em http://localhost:3000
npm run lint     # ESLint
npm run test     # Vitest (testes unitários)
npm run build    # Build de produção
npm run start    # Inicia servidor de produção (lê $PORT automaticamente)
```
