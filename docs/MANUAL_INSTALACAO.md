# Manual de Instalação e Deploy — BuddyRPG

Este manual passo a passo mostra como configurar o **BuddyRPG** do zero, tanto no seu computador (desenvolvimento) quanto em produção gratuita no **Supabase** + **Render**.

---

## 1. Pré-requisitos

- **Node.js 22+** e **npm 10+** instalados.
- **Git** instalado e conectado à sua conta do GitHub ([FelipeOthon/BuddyRpg](https://github.com/FelipeOthon/BuddyRpg)).
- Conta gratuita no [Supabase](https://supabase.com/).
- Conta gratuita no [Render](https://render.com/).

---

## 2. Configuração do Banco de Dados no Supabase (Do Zero)

### Passo 2.1 — Criar o projeto
1. Acesse o painel do [Supabase](https://supabase.com/dashboard) e clique em **New project**.
2. Escolha a organização, dê o nome `BuddyRPG`, defina uma senha forte para o banco PostgreSQL e selecione a região mais próxima (ex.: *South America (São Paulo)* ou *East US*).
3. Aguarde ~2 minutos até o projeto ficar com status **Active**.

### Passo 2.2 — Executar as Migrations SQL (Tabelas, RLS, Realtime e Storage)
1. No menu lateral do Supabase, clique em **SQL Editor** → **New query**.
2. Abra o arquivo [0000_all_in_one.sql](../supabase/migrations/0000_all_in_one.sql) deste repositório, copie **todo** o conteúdo e cole no editor do Supabase.
   - *(Alternativa modular: você também pode rodar na ordem [0001_schema.sql](../supabase/migrations/0001_schema.sql), [0002_functions.sql](../supabase/migrations/0002_functions.sql), [0003_rls.sql](../supabase/migrations/0003_rls.sql), [0004_realtime.sql](../supabase/migrations/0004_realtime.sql) e [0005_storage.sql](../supabase/migrations/0005_storage.sql)).*
3. Clique em **Run** (ou `Ctrl + Enter`). Deve aparecer `Success. No rows returned`.

### Passo 2.3 — Verificar a Segurança (Teste Automatizado de RLS)
1. Ainda no **SQL Editor**, clique em **New query**.
2. Copie e cole o conteúdo de [rls_checks.sql](../supabase/tests/rls_checks.sql) e clique em **Run**.
3. Na aba **Messages** (ou Results), confira a mensagem:
   > `SUCESSO: Todos os testes de RLS, fichas privadas, cadeado do Mestre, cenas secretas e proteção de roll_result passaram!`
   *(O script usa `BEGIN ... ROLLBACK`, portanto não deixa dados de teste sujos no banco).*

### Passo 2.4 — Configurar Realtime Privado e Autenticação
1. **Realtime privado:** Vá em **Project Settings** (ícone de engrenagem) → **Realtime** e **desative** a opção **Allow public access** (assim somente canais privados autenticados via RLS são aceitos).
2. **Autenticação por E-mail:**
   - Vá em **Authentication** → **Providers** → **Email**.
   - **Dica importante para camada gratuita:** O servidor de e-mail padrão do Supabase tem limite de ~2 a 4 e-mails por hora. Para testar sem bloqueio, **desmarque** a opção **Confirm email** e clique em **Save**.
3. **URLs de Redirecionamento (Auth):**
   - Vá em **Authentication** → **URL Configuration**:
   - Em **Site URL**, coloque `http://localhost:3000` (quando publicar no Render, troque para `https://seu-app.onrender.com`).
   - Em **Redirect URLs**, adicione:
     - `http://localhost:3000/**`
     - `https://*.onrender.com/**`
4. *(Opcional)* **Login com Google:**
   - Crie um *OAuth 2.0 Client ID* no [Google Cloud Console](https://console.cloud.google.com/apis/credentials), adicionando a *Callback URL* exibida em **Authentication → Providers → Google** no Supabase.
   - Cole o *Client ID* e *Client Secret* no painel do Supabase e salve.

### Passo 2.5 — Copiar as Chaves da API
1. Vá em **Project Settings** → **API** (ou **API Keys**).
2. Copie:
   - **Project URL** → será o seu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** (ou `sb_publishable_...`) → será o seu `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role / secret** (ou `sb_secret_...`) → será o seu `SUPABASE_SECRET_KEY` *(⚠️ Nunca exponha esta chave no front-end!)*

---

## 3. Rodando o Projeto Localmente

1. Na pasta raiz do projeto (`c:\lgcyrpgtabuleiro`), crie o arquivo `.env.local` copiando o `.env.example`:
   ```powershell
   Copy-Item .env.example .env.local
   ```
2. Edite o arquivo `.env.local` com as chaves copiadas no Passo 2.5:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-ou-anon
   SUPABASE_SECRET_KEY=sua-chave-service-role-secreta
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
3. Instale as dependências (caso ainda não tenha instalado) e inicie o servidor:
   ```powershell
   npm install
   npm run dev
   ```
4. Acesse `http://localhost:3000`.

---

## 4. Deploy no Render (Camada Gratuita)

1. Garanta que suas alterações foram enviadas para o GitHub:
   ```powershell
   git push origin main
   ```
2. No painel do [Render](https://dashboard.render.com/), clique em **New +** → **Blueprint** (para usar o arquivo [render.yaml](../render.yaml) automaticamente) ou **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositório `FelipeOthon/BuddyRpg`.
4. Preencha as variáveis de ambiente no Render:
   - `NODE_VERSION`: `22`
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Chave pública/anon do Supabase
   - `SUPABASE_SECRET_KEY`: Chave secreta (`service_role`) do Supabase
   - `NEXT_PUBLIC_SITE_URL`: URL gerada pelo Render (ex.: `https://buddy-rpg.onrender.com`)
5. Clique em **Apply / Create Web Service**.
   - **Atenção:** Como variáveis `NEXT_PUBLIC_*` são embutidas durante o `npm run build`, sempre que alterar uma variável `NEXT_PUBLIC_*` no Render, clique em **Manual Deploy → Clear build cache & deploy**.
6. Teste o health check em `https://<seu-app>.onrender.com/api/health`.
