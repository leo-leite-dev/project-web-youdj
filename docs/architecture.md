# Arquitetura — YouDJ

## 1. Visão geral

O YouDJ será uma plataforma SaaS multi-tenant em que cada DJ gerencia suas próprias salas de
música, pedidos e histórico. Convidados acessam uma sala por link ou QR Code, sem cadastro
obrigatório.

Esta versão entrega a fundação frontend, cadastro/login/logout de DJs com Supabase Auth, leitura
ou criação idempotente do perfil autenticado em `public.dj_profiles` e criação/listagem de salas
em `public.rooms`. A migration de perfis, com RLS e testes pgTAP, foi aplicada ao Supabase
remoto; a migration de salas está preparada localmente e ainda não foi aplicada. O login com
Google foi validado com conta real; os fluxos de e-mail/senha seguem com validação remota
pendente.

## 2. Tecnologias atuais

| Camada            | Tecnologia                        | Papel                                      |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Build/dev server  | Vite 8                            | Desenvolvimento e empacotamento            |
| Interface         | React 19                          | Componentes e composição da UI             |
| Linguagem         | TypeScript 5.9 (strict)           | Tipagem estática                           |
| Estilos           | Tailwind CSS 4                    | Design system utilitário e responsividade  |
| Navegação         | React Router 7                    | Rotas públicas, painel e convidados        |
| Integração        | @supabase/supabase-js 2.118.0     | Auth e acesso tipado ao perfil do DJ       |
| Qualidade         | ESLint 10                         | Análise estática                           |
| Testes            | Vitest 5 + Testing Library 16     | Testes essenciais de UI e regras           |

## 3. Estrutura atual

```text
src/
  app/                    # composição da aplicação (router provider)
  components/             # componentes reutilizáveis (Brand, ícones, badges)
  features/
    auth/                 # AuthProvider, proteção de rota, validação e serviços de auth/perfil
    rooms/                # tipos, validação, store, hook e seção de salas do painel
    guest/lib/            # regras puras do domínio de convidados
  integrations/
    supabase/             # cliente tipado e integração com Supabase
  layouts/                # PublicLayout e DjLayout
  pages/
    dj/                   # login, cadastro e painel do DJ
    guest/                # acesso por código da sala
    HomePage.tsx          # apresentação do produto
    NotFoundPage.tsx      # 404
  routes/                 # tabela de rotas
  styles/                 # Tailwind e tokens visuais
  test/                   # setup do Vitest e doubles de teste
  vite-env.d.ts           # tipagem das variáveis de ambiente do Vite
public/
  _redirects              # fallback de rotas da SPA para o Cloudflare Pages
  favicon.svg
supabase/
  config.toml             # configuração do stack local e dos testes
  migrations/             # migrations SQL versionadas; perfis aplicado, salas preparado
  tests/                  # testes pgTAP de RLS e integridade (perfis e salas)
.github/
  workflows/
    supabase-tests.yml    # execução local dos testes pgTAP em Pull Requests
.nvmrc                    # versão do Node usada no build local e no Cloudflare Pages
```

A separação busca manter regras de negócio fora dos componentes de interface. Regras puras
testáveis ficam em `features/*/lib`.

## 4. Rotas e estados

| Rota              | Natureza   | Comportamento atual                                      |
| ----------------- | ---------- | -------------------------------------------------------- |
| `/`               | Implementada | Apresentação, proposta de valor e CTAs.                |
| `/dj`             | Implementada | Login de DJ via Supabase Auth (e-mail ou Google).       |
| `/dj/cadastro`    | Implementada | Cadastro de DJ; confirmação de e-mail ou Google.        |
| `/dj/painel`      | Protegida   | Exige sessão não anônima e perfil carregado; cria e lista salas. |
| `/sala/:roomCode` | Prévia      | Valida formato local; não consulta banco de dados.      |
| `*`               | Implementada | Página 404.                                            |

A validação do código de sala em `features/guest/lib/roomCode.ts` normaliza o valor e exige
exatamente 6 caracteres alfanuméricos (`A-Z`, `0-9`). Isso é apenas validação de formato, não
de existência.

## 5. Conceito multi-tenant

O modelo planejado é de **schema compartilhado com isolamento por linha**:

- Cada DJ tem uma conta Supabase Auth e um perfil vinculado pelo mesmo identificador.
- Futuras tabelas de domínio (salas, pedidos, músicas, pagamentos) terão `dj_id` obrigatório.
- Row Level Security (RLS) no PostgreSQL permitirá leitura e escrita apenas quando o usuário
  autenticado corresponder ao dono do recurso.
- Chaves com privilégio de serviço nunca serão usadas no cliente.
- A camada de interface nunca será considerada a única barreira de autorização.

A primeira tabela, `public.dj_profiles`, foi aplicada ao banco remoto:

- `id uuid` é chave primária e referencia `auth.users(id)` com `on delete cascade`.
- `display_name text` é obrigatório, tem de 2 a 80 caracteres e não aceita espaços em branco
  nas extremidades.
- `created_at` e `updated_at` são gerados pelo banco; `updated_at` é mantido por trigger.
- RLS está habilitada. `authenticated` recebe apenas `SELECT`, `INSERT` e `UPDATE` nas colunas
  necessárias; `anon` não recebe privilégios e `DELETE` não é concedido.
- As políticas exigem `auth.uid() = id` e o claim `is_anonymous` explicitamente `false`,
  impedindo que convidados anônimos criem ou alterem perfis de DJ.
- A suíte pgTAP cobre permissões, isolamento entre usuários, convidados anônimos, constraints,
  integridade referencial e cascade, com 28 asserções. Ela é executada pelo workflow
  `.github/workflows/supabase-tests.yml` em um Supabase local isolado no GitHub Actions, sem
  conexão com o projeto remoto.

A segunda tabela, `public.rooms` (migration `20261102000000_create_rooms.sql` preparada
localmente e ainda não aplicada ao remoto):

- `id uuid` é chave primária gerada pelo banco; `dj_id` referencia `dj_profiles(id)` com
  `on delete cascade`.
- `name text` tem de 2 a 60 caracteres e não aceita espaços nas extremidades; `status text` é
  restrito a `active`/`paused`, com `active` como padrão do banco.
- `created_at` e `updated_at` são gerados pelo banco; `updated_at` é mantido por trigger, e o
  índice `(dj_id, created_at desc)` sustenta a listagem do proprietário.
- RLS está habilitada. `authenticated` recebe `SELECT` em todas as colunas, `INSERT` apenas em
  `dj_id` e `name` e `UPDATE` apenas em `name` e `status`; `DELETE` não é concedido e `anon` não
  recebe privilégios.
- As políticas exigem `dj_id = auth.uid()` e o claim `is_anonymous` explicitamente `false`, nas
  operações de leitura, criação e atualização. Não existe política de `DELETE`, portanto nenhum
  DJ exclui salas pela API, e nenhum DJ lê ou altera salas de outro DJ.
- A suíte pgTAP `supabase/tests/rooms_rls.test.sql` tem 33 asserções e é executada pelo mesmo
  workflow do GitHub Actions em um Supabase local isolado.

As demais tabelas de domínio (pedidos, músicas, pagamentos) deverão usar `dj_id` obrigatório e
políticas RLS equivalentes, sempre validadas no banco antes de qualquer dado real.

### Convidados

O acesso será por link/QR Code. Identidades anônimas do Supabase Auth poderão ser usadas para
limitar e auditar solicitações sem exigir cadastro. Regras de rate limiting e moderação serão
avaliadas junto da implementação de pedidos.

## 6. Integrações

### Cliente Supabase

O SDK `@supabase/supabase-js` está instalado. O cliente é criado sob demanda em
`src/integrations/supabase/client.ts`, com validação de `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY`. O acesso deve ser feito por `getSupabaseClient()`. Apenas a
chave pública pode ser usada no frontend.

### Autenticação e perfil de DJ

- `AuthProvider` inicializa a sessão e observa `onAuthStateChange`; operações de rede não são
  aguardadas dentro do callback do Supabase.
- `AuthGateway` concentra `getSession`, cadastro, login, logout e assinatura de mudanças de
  sessão. `DjProfileStore` concentra leitura e criação do perfil para facilitar testes isolados.
- Cadastro guarda `display_name` em `user_metadata`; quando a confirmação de e-mail está
  habilitada, o formulário informa que o DJ deve confirmar o endereço antes do login.
- Após uma sessão de DJ válida, o serviço consulta o próprio perfil e cria um registro ausente
  via `upsert` com conflito ignorado, seguido de nova leitura. Isso torna a criação segura para
  chamadas concorrentes e repetidas.
- `/dj/painel` é envolvida por `RequireDjAuth`, que rejeita sessões sem usuário ou anônimas e só
  libera a área após o perfil ser carregado. A RLS da tabela continua sendo a autoridade real.
- A implementação não fornece recuperação de senha, OAuth de outros provedores, autenticação de
  convidados ou autorização para salas/pedidos.

### Login com Google

- `AuthGateway.signInWithOAuth` chama `supabase.auth.signInWithOAuth({ provider: 'google' })`
  com o escopo padrão do projeto (`email profile`); nenhuma permissão adicional é solicitada.
- O `redirectTo` é a raiz do domínio atual (`window.location.origin`), que precisa estar
  autorizada no painel do Supabase. O destino final é resolvido no cliente: o intent é gravado em
  `sessionStorage` antes do redirect e consumido por `OAuthReturnHandler` quando a sessão é
  estabelecida. Isso evita depender de rota profunda na allowlist e funciona igual em localhost e
  no Cloudflare Pages.
- Cancelamentos e erros do provedor chegam na URL de retorno (`error`, `error_code`,
  `error_description`). O handler limpa os parâmetros, traduz o código para uma mensagem em
  português e leva o usuário à tela de login.
- Em desenvolvimento local, a porta autorizada é a 3000; o provedor aplica uma verificação
  antes de iniciar o fluxo e orienta o desenvolvedor quando o endereço não é válido.
- O perfil do DJ continua sendo lido ou criado por `auth.uid()`, respeitando a RLS. Quando o
  Supabase vincula as identidades Google e e-mail/senha do mesmo e-mail verificado, o usuário
  mantém o mesmo `auth.users.id` e, portanto, o mesmo registro em `public.dj_profiles`.

Supabase Auth e as operações de perfil estão ativas em runtime. O login com Google foi validado
com conta real, incluindo o retorno pelo domínio de produção e a leitura/criação do próprio
perfil sob a RLS existente; os fluxos de e-mail/senha e o isolamento entre duas contas reais
ainda não foram validados no projeto remoto. Testes frontend usam doubles e não comprovam a RLS
real por si sós. A migration de `public.dj_profiles` permanece aplicada; nenhuma migration ou
configuração remota foi alterada nesta etapa.

### Salas do DJ

- `RoomStore` (`src/features/rooms/services/roomStore.ts`) concentra a listagem por
  proprietário (ordenada por `created_at` decrescente) e a criação com retorno da linha criada,
  no mesmo padrão de `DjProfileStore`.
- `useRooms` expõe status derivado (carregamento, pronto, erro, ocioso), recarga e criação; o
  efeito só atualiza estado dentro de callbacks assíncronos, como o `AuthProvider`.
- `RoomsSection` renderiza os estados de carregamento, vazio, erro com nova tentativa e a lista
  com selo de status. A validação do nome (2 a 60 caracteres) é local e o servidor revalida pela
  constraint da tabela.
- O painel usa a lista para a contagem de salas ativas. A migration de `public.rooms` ainda não
  foi aplicada ao remoto; QR Codes, links de convidados e a edição de salas pela interface não
  existem nesta etapa.

### Publicação no Cloudflare Pages

- O projeto é um SPA estático do Vite: build `npm run build`, saída `dist/`, sem
  Functions/Workers.
- `public/_redirects` reescreve qualquer caminho para `/index.html` com status 200, para que
  `/dj`, `/dj/cadastro`, `/dj/painel` e `/sala/:roomCode` funcionem no acesso direto e na
  atualização da página. Sem esse arquivo, o Pages responderia 404 nessas rotas.
- `.nvmrc` fixa Node `22.16.0`: o build system do Pages não lê o campo `engines` do
  `package.json` e o Vite 8 exige Node `>=22.12` (o padrão do build system v2 seria 18.x).
- Endereço de produção: `https://project-web-youdj.pages.dev`. As variáveis públicas
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` já estão configuradas no Cloudflare;
  nenhuma variável secreta é necessária no provedor.
- O retorno do OAuth usa a raiz do domínio atual, coberta pela allowlist
  `https://project-web-youdj.pages.dev/**`; como a raiz existe como arquivo estático, o
  retorno não depende do fallback de rotas.
- O aplicativo Google OAuth está em modo de teste no Google Cloud (restrito a usuários de
  teste); isso limita o login Google, não a publicação do site nem o e-mail/senha.

### Serviços — estado atual

| Integração              | Uso planejado                                                | Estado      |
| ----------------------- | ------------------------------------------------------------ | ----------- |
| Supabase Auth           | Cadastro/login/logout de DJs (e-mail e Google)      | Implementado; Google validado com conta real |
| Supabase Auth           | Identidades anônimas de convidados                             | Planejado |
| Supabase PostgreSQL     | Perfil de DJ (`public.dj_profiles`)                            | Implementado; leitura/criação no login Google real |
| Supabase PostgreSQL     | Salas (`public.rooms`)                                         | Implementado; migration local pendente de aplicação |
| Supabase PostgreSQL     | Pedidos, músicas, pagamentos e histórico                       | Planejado |
| Supabase Realtime       | Atualização da fila e dos pedidos em tempo real               | Planejado   |
| Cloudflare Pages        | Hospedagem do frontend estático                               | Deploy publicado em 2026-11-02; variável pública faltando no bundle |
| APIs de pagamentos      | Pedidos pagos e histórico financeiro                          | Planejado   |
| YouTube IFrame Player API | Reprodução/controle de vídeos e músicas                     | Planejado   |

Supabase Auth, as operações de leitura/criação de `public.dj_profiles` e a criação/listagem de
`public.rooms` estão integrados em runtime (a migration de salas pendente de aplicação remota).
Realtime, pedidos, pagamentos e player continuam planejados. No Cloudflare Pages, o deploy do
commit `a12f170` foi acompanhado com sucesso em 2026-11-02, mas o bundle publicado ficou sem
`VITE_SUPABASE_URL`, deixando a autenticação em produção indisponível até a correção da variável
e um novo deploy (não revalidado desde então).

## 7. Segurança

Princípios que devem orientar as próximas etapas:

- Segredos apenas em variáveis de ambiente locais ou no provedor; nunca no repositório.
- Apenas a publishable key pode ser exposta no frontend. `service_role`, secret keys e a senha
  do banco nunca devem ser usadas no cliente.
- Autorização validada no banco e no servidor, não apenas no cliente; o guard React é defesa
  complementar e não substitui RLS.
- Menor privilégio para chaves e tokens.
- Validação de entrada tanto no cliente quanto no servidor.
- Isolamento explícito por `dj_id` em todas as consultas.
- Conteúdo de terceiros (músicas, vídeos, imagens) usado somente com autorização.
- Nenhuma simulação de pagamento ou autenticação apresentada como funcionalidade real.

## 8. Fora do escopo desta etapa

- Persistência de pedidos e Supabase Realtime.
- QR Codes, links de convidados e identidades anônimas.
- Pagamentos.
- Player de música/vídeo.
- Execução de migrations remotas (a de `public.rooms` aguarda autorização).
- Testes end-to-end em navegador.

## 9. Próximos passos recomendados

1. Corrigir `VITE_SUPABASE_URL` no Cloudflare Pages, reexecutar o deploy e revalidar a
   autenticação no domínio de produção.
2. Aplicar a migration `20261102000000_create_rooms.sql` ao projeto remoto (com autorização) e
   executar a suíte pgTAP de `rooms` no workflow do GitHub Actions.
3. Validar cadastro, confirmação de e-mail, login e logout por e-mail/senha com uma conta real,
   além do isolamento entre duas contas de DJs.
4. Publicar ou verificar o aplicativo Google OAuth no Google Cloud para liberar o login Google
   além dos usuários de teste.
5. Implementar QR Code e links de convidados para as salas já existentes.
6. Implementar pedidos com Supabase Realtime.
7. Adicionar player e, depois, pagamentos.
