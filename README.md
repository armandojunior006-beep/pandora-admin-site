# Pandora BOT — Painel Admin (usuários, planos, licenças/tokens)

Site separado do Electron, feito pra você gerenciar seus clientes pela web.
Next.js (App Router) + Postgres (Neon) + login próprio com senha com hash.

## 1. Criar o banco (Neon — grátis)

1. Crie uma conta em https://neon.tech (login com GitHub é o mais rápido).
2. Crie um projeto novo (qualquer nome, ex: `pandora-bot`).
3. Na aba **Connection string**, copie a que tem `-pooler` no host — algo como:
   `postgres://usuario:senha@ep-xxxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`
4. Não precisa rodar o `schema.sql` manualmente — o site cria as tabelas
   sozinho na primeira requisição (`ensureSchema()`), inclusive quando você
   roda `npm run create-admin`.

## 2. Rodar local (antes de subir na Vercel)

```bash
cd pandora-admin-site
npm install
cp .env.example .env.local
```

Edite `.env.local`:
- `DATABASE_URL` → cole a connection string do Neon (passo 1).
- `SESSION_SECRET` → gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SETUP_SECRET` → gere outro valor do mesmo jeito (não precisa usar, é só uma trava extra do endpoint de criar o 1º admin).

Crie seu login de admin:
```bash
npm run create-admin -- seu_usuario "SuaSenhaForte123"
```

Rode o site local:
```bash
npm run dev
```
Abra http://localhost:3000 → redireciona pro login → entre com o que você criou.

## 3. Publicar na Vercel (grátis)

1. Suba esta pasta (`pandora-admin-site/`) num repositório Git (GitHub/GitLab).
2. Na Vercel: **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione as 3 mesmas do `.env.local`
   (`DATABASE_URL`, `SESSION_SECRET`, `SETUP_SECRET`) — use os MESMOS valores
   que você usou local (principalmente `DATABASE_URL`, senão o site em
   produção vai enxergar um banco vazio).
4. Deploy. Pronto — seu admin (`npm run create-admin` já rodou contra o
   mesmo Neon) já funciona em produção também, porque é o mesmo banco.

## O que tem hoje

- **Login** — sessão via cookie httpOnly assinado (JWT), 7 dias.
- **Usuários** — cadastro dos seus clientes (nome, login, contato, notas, status).
- **Planos** — nome, duração em dias (vazio = vitalício), preço.
- **Licenças/Tokens** — gera um token por cliente vinculado a um plano,
  calcula vencimento automático, permite renovar (soma a duração do plano),
  suspender/reativar e excluir.

## O que NÃO tem ainda (de propósito — combinamos deixar pra depois)

- **Validação automática no bot**: hoje o token existe só aqui no painel.
  O Electron (`novo-pandora-bot`) ainda não consulta este site pra travar o
  uso quando a licença vence. Quando você quiser isso, é um endpoint novo
  aqui (`/api/licenses/validate`, recebendo token + HWID) chamado pelo bot
  no início (`pandora:device-id` e `pandora:sign-payload` já existem no
  código do bot pra isso).
- Cobrança/pagamento automático (Pix, cartão) — hoje o plano/licença é
  criado manualmente por você aqui no painel.
- Envio automático do token pro cliente (hoje você copia o token na tela de
  Licenças e manda por fora — WhatsApp, etc.).

## Estrutura

```
app/
  login/page.js              tela de login
  dashboard/layout.js         sidebar + navegação
  dashboard/page.js           visão geral (contadores)
  dashboard/users/            usuários (lista + modal criar/editar)
  dashboard/plans/            planos
  dashboard/licenses/         licenças/tokens
  api/auth/{login,logout,setup}/route.js
  api/users/route.js + [id]/route.js
  api/plans/route.js + [id]/route.js
  api/licenses/route.js + [id]/route.js
lib/
  db.js       conexão Neon + criação de tabelas (ensureSchema)
  auth.js     hash de senha (bcrypt) + sessão (JWT via jose)
  schema.sql  mesmo schema, versão "cole no SQL editor" se preferir manual
middleware.js  protege /dashboard/* (redireciona pro /login sem sessão)
scripts/create-admin.mjs
```
