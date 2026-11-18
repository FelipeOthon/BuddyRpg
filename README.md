# BuddyRPG — Virtual Tabletop Minimalista

VTT minimalista em tempo real construído com **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **react-konva 19** e **Supabase** (PostgreSQL + Auth + Realtime + Storage), preparado para hospedagem no **Render**.

## Scripts locais

```bash
npm run dev      # Servidor de desenvolvimento em http://localhost:3000
npm run lint     # ESLint
npm run test     # Vitest (testes unitários)
npm run build    # Build de produção
npm run start    # Inicia servidor de produção (lê $PORT automaticamente)
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto no Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` *(somente no servidor — nunca exponha com `NEXT_PUBLIC_`)*
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` localmente ou a URL `.onrender.com` em produção)

## Deploy no Render (Fase 0)

O repositório inclui um arquivo `render.yaml` configurado para criar o Web Service `buddy-rpg` (Node 22, plano Free, health check em `/api/health`):

1. Faça push da branch `main` para `https://github.com/FelipeOthon/BuddyRpg`.
2. No painel do Render, clique em **New +** → **Blueprint** (ou **Web Service**) e selecione o repositório `FelipeOthon/BuddyRpg`.
3. Preencha as variáveis de ambiente solicitadas (ou deixe valores temporários na Fase 0 até criarmos o projeto Supabase na Fase 1).
4. Verifique `https://<seu-servico>.onrender.com/api/health` → deve responder `200 {"ok":true,"service":"buddy-rpg",...}`.
