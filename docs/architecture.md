# Arquitetura — YouDJ

## 1. Visão geral

O YouDJ será uma plataforma SaaS multi-tenant em que cada DJ gerencia suas próprias salas de
música, pedidos e histórico. Convidados acessam uma sala por link ou QR Code, sem conta; no primeiro
acesso informam um nome ou apelido não verificado.

Esta versão entrega a fundação frontend, cadastro/login/logout de DJs com Supabase Auth, leitura
ou criação idempotente do perfil autenticado em `public.dj_profiles`, salas em `public.rooms`,
códigos públicos, links compartilháveis, QR Codes e consulta pública limitada da sala no código.
As migrations de perfil, salas e códigos públicos foram aplicadas ao Supabase remoto. A Etapa 3B
foi verificada por consultas somente de leitura, e os 88 testes pgTAP foram aprovados no GitHub
Actions. A interface autenticada possui gerenciamento de salas e uma página de gerenciamento por
sala. Papéis owner/moderator e convites de moderadores foram preparados em migrations locais; esses
novos fluxos não foram aplicados ou validados no Supabase remoto.

## 2. Tecnologias atuais

| Camada            | Tecnologia                        | Papel                                      |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Build/dev server  | Vite 8                            | Desenvolvimento e empacotamento            |
| Interface         | React 19                          | Componentes e composição da UI             |
| Linguagem         | TypeScript 5.9 (strict)           | Tipagem estática                           |
| Estilos           | Tailwind CSS 4                    | Design system utilitário e responsividade  |
| Navegação         | React Router 7                    | Rotas públicas, painel e convidados        |
| Integração        | @supabase/supabase-js 2.118.0     | Auth e acesso tipado a perfis/salas         |
| QR Code           | qrcode 1.5.4                     | Geração local de PNG, sem serviço externo   |
| Qualidade         | ESLint 10                         | Análise estática                           |
| Testes            | Vitest 5 + Testing Library 16     | Testes essenciais de UI e regras           |

## 3. Estrutura atual

```text
src/
  app/                    # composição da aplicação (router provider)
  components/             # componentes reutilizáveis (Brand, ícones, badges)
  features/
    auth/                 # AuthProvider, proteção de rota, validação e serviços de auth/perfil
    rooms/                # salas, links/QR, stores privado/público e UI de gerenciamento
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
  migrations/             # migrations SQL versionadas e aplicadas ao remoto
  tests/                  # testes pgTAP de RLS, códigos e integridade
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
| `/dj/painel`      | Protegida   | Exige sessão não anônima e perfil carregado; resume as salas. |
| `/dj/painel/salas` | Protegida  | Cria, lista, ativa/pausa e compartilha salas; exibe o DJ associado pelo perfil. |
| `/dj/painel/salas/:roomId` | Protegida | RPC restringe ao owner/moderator; presença/pedidos para ambos, moderadores owner-only. Migration `20261112000000` local. |
| `/sala/:roomCode` | Implementada | Consulta limitada via `room_by_code_with_membership`; nome público do DJ, UUID/papel administrativo somente para membro autenticado. |
| `*`               | Implementada | Página 404.                                            |

A validação do código de sala em `features/guest/lib/roomCode.ts` normaliza o valor e exige
exatamente 10 caracteres alfanuméricos (`A-Z`, `0-9`). Isso é apenas validação de formato, não
de existência.

## 5. Conceito multi-tenant

O modelo planejado é de **schema compartilhado com isolamento por linha**:

- Cada DJ tem uma conta Supabase Auth e um perfil vinculado pelo mesmo identificador.
- As tabelas de domínio pertencentes a um DJ usam `dj_id` obrigatório; `rooms` já segue esse
  padrão, e pedidos/músicas/pagamentos futuros deverão fazê-lo também.
- Row Level Security (RLS) no PostgreSQL permitirá leitura e escrita apenas quando o usuário
  autenticado corresponder ao dono do recurso.
- Chaves com privilégio de serviço nunca serão usadas no cliente.

### Papéis por sala (implementação local pendente de validação remota)

- `rooms.dj_id` determina o owner; `public.room_moderators` concede papel moderador por sala.
- A tabela de membership não possui grants para papéis de API; RPCs `SECURITY DEFINER` validam
  `auth.uid()`, rejeitam sessões anônimas para operações administrativas e não recebem ator/role
  do cliente.
- Owner pode convidar/revogar conta existente, confirmada, não anônima e com perfil. Moderador pode
  listar pedidos/presença e alterar status somente na sala atribuída; não altera configurações,
  membership ou ownership.
- `20261112000000_room_moderators_and_permissions.sql` depende de
  `20261111000000_guest_identity_presence_room_management.sql`; aplicação remota não realizada.
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

A segunda tabela, `public.rooms` (migration `20261102000000_create_rooms.sql` aplicada ao remoto
em 2026-11-02):

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

O código público e a consulta limitada são definidos pela migration
`20261103000000_add_rooms_public_code.sql`, aplicada ao Supabase remoto:

- `code` é único, obrigatório, restrito a 10 caracteres `A-Z0-9` (~52 bits de entropia) e
  preenchido no banco. A migration faz backfill das salas existentes antes de aplicar `NOT NULL`,
  preservando as linhas; o gerador usa `gen_random_uuid()` com amostragem uniforme e rejeição.
- `authenticated` pode ler `code` das próprias salas; não pode defini-lo no `INSERT` nem alterá-lo
  no `UPDATE`. O papel `anon` não recebe privilégios na tabela e as políticas RLS existentes não
  são alteradas.
- A consulta pública usa uma RPC separada; não há grant de `SELECT` na tabela para `anon`.
- `rooms_public_code.test.sql` contém 27 asserções sobre grants, geração/imutabilidade do código,
  reabilitação do trigger de timestamp e limites da RPC. Junto às suítes existentes, o workflow
  executa 154 asserções pgTAP no total, incluindo a Etapa 4A.

### Códigos e consulta pública de salas

A migration `20261103000000_add_rooms_public_code.sql` está aplicada ao remoto e foi confirmada
no histórico e no schema do projeto YouDJ:

- Adiciona `rooms.code`, único, obrigatório e validado como 10 caracteres `A-Z0-9` (~52 bits de
  entropia); faz backfill das salas existentes antes de aplicar `NOT NULL`, preservando linhas e
  `updated_at` (o trigger de timestamp é reabilitado mesmo em caso de erro). O código é gerado no
  banco a partir de `gen_random_uuid()` com amostragem uniforme e atribuído por trigger; a API
  não concede `INSERT` nem `UPDATE` nessa coluna.
- O proprietário pode ler o próprio código por `RoomStore`; o grant da coluna `code` é apenas
  para `authenticated`. As políticas existentes de `rooms` não são alteradas, e `anon` continua
  sem privilégios sobre a tabela.
- `public.room_by_code(p_code)` é uma função `SECURITY DEFINER`, `STABLE`, com `search_path`
  vazio e execução concedida apenas a `anon` e `authenticated`. Faz igualdade sobre o código
  único e retorna `code`, `name`, `status` e os quatro booleanos públicos de apresentação
  (adicionados na Etapa 3C) — nunca `dj_id`, IDs internos ou timestamps; assim não há leitura ou
  listagem pública direta da tabela.
- `PublicRoomStore` chama `room_by_code_with_membership`; a página `/sala/:roomCode` distingue código inválido, sala não
  encontrada, sala pausada e falha de rede. Não requer sessão de convidado.
- Os QR Codes são gerados localmente no navegador pela biblioteca `qrcode`, sem enviar links ou
  dados de sala a serviços de terceiros. O painel oferece cópia do link e download PNG.
- A suíte `supabase/tests/rooms_public_code.test.sql` tem 27 asserções para grants, imutabilidade,
  geração, unicidade, reabilitação do trigger de timestamp e escopo da RPC. As 88 asserções da
  Etapa 3B foram aprovadas; com a Etapa 4A, o workflow executa 154 asserções no total (28 + 33 +
  27 + 17 + 49).

A tabela inicial de pedidos da Etapa 4A inclui `dj_id` e `room_id`, tem RLS habilitada e nenhum
grant/policy direto para clientes ou `service_role`; somente RPCs específicas, executáveis por
`service_role`, fazem operações validadas. A migration foi aplicada ao projeto remoto YouDJ e
schema, grants, políticas e funções foram conferidos por consultas somente leitura. A suíte pgTAP
com 154 asserções é executada em um Supabase local isolado no GitHub Actions, sem credenciais ou
acesso ao projeto remoto. Outras tabelas de domínio deverão preservar o mesmo isolamento por
proprietário.

### Convidados

- O convidado acessa por link/QR Code e informa nome ou apelido antes de entrar. `guest_id` UUID
  aleatório e apelido são reutilizados pelo mesmo navegador via localStorage; não são autenticação,
  prova de identidade nem autorização administrativa. Apelidos podem ser falsos ou compartilhados.
- A Pages Function registra heartbeat para a sala ativa. O banco atualiza `last_seen_at` por par
  sala/guest_id; a presença deixa de contar após 90s sem atualização e os registros inativos são
  limpos após 24h. O navegador envia heartbeat a cada 30s enquanto visível e ao retornar à aba; a
  tela do DJ consulta a lista periodicamente, sem Supabase Realtime.
- Cada pedido novo traz o `guest_id`; a RPC recupera o apelido da presença recente no banco, sem
  confiar em nome enviado junto ao pedido. Apelido e ID do pedido permanecem conforme retenção de
  30 dias. Registros antigos sem apelido não são preenchidos retroativamente.

### Etapa 4A — pesquisa e pedidos

- A SPA chama `POST /api/youtube-search` somente após envio explícito do campo pelo botão da lupa
  (ou submit acessível por teclado); digitar não chama a API. `POST /api/guest-requests` ocorre só
  após seleção/confirmação. Cloudflare Pages Functions ficam em `functions/api`; Vite não as
  executa por conta própria.
- `YOUTUBE_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são bindings de runtime do Pages. O navegador
  nunca recebe chave do YouTube nem credencial privilegiada. O binding Supabase aceita a chave
  legada `service_role` ou a chave moderna `sb_secret_`; as Functions enviam a credencial apenas
  pelo header `apikey`, pois as chaves modernas não são JWTs e não devem ser usadas como
  `Authorization: Bearer`. A chave privilegiada chama RPCs `SECURITY DEFINER` estritamente
  concedidas a `service_role`.
- A RPC de gate valida sala ativa, serializa pesquisas idênticas e preserva o cache normalizado por
  6h; não aplica orçamento diário nem bloqueio de busca por IP/usuário. Somente após iniciar uma
  chamada upstream `search.list`, a Function incrementa `youtube_search_usage` no banco compartilhado.
  Cache hits, seleção e envio do pedido não incrementam o contador. Falhas ao registrar podem deixar
  a estimativa defasada; o contador não é telemetria oficial do Google.
- `youtube_search_budget_config.daily_search_quota` é a quota configurável apenas para apresentação,
  com valor inicial 100; não bloqueia consultas. O endpoint público de leitura retorna somente total,
  quota configurada, dia e instante do próximo reset, sem expor dados da sala, tabela ou credenciais.
  A contagem e virada do dia usam `America/Los_Angeles`, incluindo horário de verão. Todos os
  deployments que precisam compor uma estimativa global devem compartilhar o mesmo banco.
- Fonte: [documentação oficial de custos e cotas](https://developers.google.com/youtube/v3/determine_quota_cost).
  O Google controla o limite real; chamadas inválidas ou que falham também podem consumir quota.
- Pedidos são validados e inseridos no servidor como `pending`, associados à sala, `dj_id`, apelido
  e identificador pseudônimo do navegador.
  Há limite de 5/IP/10 minutos; nenhuma tabela administrativa concede acesso direto a `anon` ou
  `authenticated`. Na implementação inicial da Etapa 4A, o backend ainda não fazia aprovação,
  fila nem reprodução; a moderação é descrita na Etapa 4B abaixo.
- A tabela de limites guarda SHA-256 do IP recebido do Cloudflare, não o IP bruto. O hash é dado
  pseudonimizado. A migration `20261106000000_add_guest_data_retention.sql` define a função
  `purge_expired_guest_data()` (pedidos >30 dias, limites >48h, cache vencido, orçamentos >31 dias
  e presenças sem atividade >24h).
  A migration separada `20261106000001_schedule_guest_data_retention.sql` configura cron horário
  quando `pg_cron` está disponível; cache deixa de ser elegível após 6h, antes da remoção física.
  Execução depende de scheduler e banco ativos: falhas ou pausa do projeto podem atrasar a limpeza.
  O plano Free pode pausar projetos após uma semana sem atividade. Contas e salas não são removidas
  pela rotina.
- Migration `20261106000002_add_private_guest_receipts_and_consent.sql` troca a RPC para
  exigir código privado e aceite; apenas o hash SHA-256 do código é persistido. Versões dos
  documentos e timestamp são associados ao pedido novo, sem histórico retroativo. O código bruto
  retorna uma única vez pela Pages Function e não há RPC pública de consulta/exclusão. O aceite de
  busca não é persistido; o registro de pedido guarda apenas a declaração enviada junto ao pedido.
- “Meus pedidos” mantém os códigos privados de comprovante no `localStorage`, com escopo por sala e
  expiração local em 30 dias; permite importar um código apresentado anteriormente. O endpoint
  `POST /api/guest-request-status` valida e transforma cada código em SHA-256 no servidor; nenhum
  `guest_id` enviado pelo navegador autoriza leitura. A RPC `guest_list_requests_by_receipt_hashes`
  usa `service_role`, limita a consulta à sala e à retenção de 30 dias e retorna apenas título,
  artista, status e data. A migration `20261113000000_guest_request_status_by_receipt.sql` e o teste
  `supabase/tests/guest_request_status.test.sql` permanecem pendentes de validação/aplicação; até lá
  o caminho real ao banco não está validado. O workflow pgTAP roda localmente no GitHub Actions em
  pushes para `develop` e pull requests para `main`.
- A pesquisa só é enviada pelo botão da lupa; mudar o texto não chama a API. O cache por query evita
  nova `search.list` em buscas repetidas, e selecionar/enviar um resultado usa o `video_id` já
  obtido, sem refazer a busca. Chave ausente, cota esgotada ou API indisponível são reportadas; pedido
  manual e link HTTPS YouTube validado continuam disponíveis.
- `surprise_mode` e `show_guest_requests` são preservados; a interface não publica fila nem lista
  de pedidos. O recibo confirma apenas gravação, não aprovação ou reprodução.
- As páginas `/termos-de-uso` e `/privacidade` descrevem o uso da YouTube Data API, dados tratados,
  cache, retenção configurada e o código/aceite dos pedidos. A interface exige aceite antes de
  buscar ou enviar; somente pedidos persistem versão e timestamp. Permanecem pendentes de revisão:
  bases legais, regiões/transferências, política de logs de terceiros e procedimento/prazo de
  atendimento a titulares. Referências: [políticas para clientes
  YouTube](https://developers.google.com/youtube/terms/developer-policies) e [Termos de Serviço do
  YouTube](https://www.youtube.com/t/terms).
- As migrations de pedidos, retenção, agendamento e recibo/aceite estão versionadas e foram
  aplicadas ao Supabase remoto segundo a verificação anterior. A migration de moderação
  (`20261107000000`) está no repositório, mas sua aplicação remota não está confirmada. Os 165
  testes pgTAP passaram no GitHub Actions do PR #3; isso não comprova o estado remoto.
- Histórico do endpoint legado `/api/youtube-search`: um teste local anterior recebeu HTTP 429
  (`daily_budget`) do gate artificial. As migrations locais `20261109000000` e `20261110000000`
  substituem esse gate pelo registro após iniciar a chamada; ainda não foram aplicadas remotamente.
  A quota personalizada do projeto Google Cloud permanece por confirmar.
- Não houve acesso aos segredos nem aos logs de runtime do Cloudflare. As Functions agora registram
  somente categoria/status/código seguro (nunca URL com chave, credencial, corpo bruto ou stack com
  dados externos) e retornam categorias de erro distinguindo chave YouTube inválida/restrita,
  API desabilitada, cota, Supabase e timeout. A causa upstream específica ainda requer executar
  essa versão local com as credenciais de servidor válidas ou consultar logs após publicação.

### Etapa 4B — busca visual e moderação

- A interface do convidado aguarda ação explícita na lupa, apresenta miniatura/título/canal e, após
  seleção, mostra “Enviar pedido ao DJ”. Digitar não aciona o YouTube. Enviar um resultado usa o
  `video_id` já selecionado e não repete `search.list`; buscas repetidas aproveitam o cache. O backend
  valida sala e cache, enquanto a própria YouTube Data API aplica a quota real.
- O recibo privado continua sendo entregue uma vez ao convidado. A confirmação informa recebimento
  pendente, sem prometer aprovação ou reprodução; `video_id` é preservado para futura integração.
- `public.guest_requests` continua sem grants diretos. As RPCs `dj_list_guest_requests()` e
  `dj_set_guest_request_status(uuid,text)` usam `auth.uid()`, rejeitam sessões anônimas e limitam
  a consulta/alteração ao `dj_id` proprietário. A transição só aceita `pending` para `approved` ou
  `rejected`; chamadas concorrentes ou pedidos de outro DJ não alteram linhas.
- A rota `/dj/painel/salas/:roomId` consulta apenas a sala do DJ autenticado, lista presença e
  pedidos pendentes/aprovados/rejeitados com apelidos. `dj_list_room_guest_requests` e
  `dj_room_online_guests` verificam `auth.uid()` e ownership no banco; `dj_guest_request_summary`
  é uma RPC legada; a interface não tem página de Visão geral e `/dj/painel` redireciona para
  `/dj/painel/salas`. A listagem detalhada fica na gestão individual da sala.
  Aprovação não cria playlist, fila nem reprodução. O painel atualiza por polling, não Realtime.
- Migration `20261107000000_add_dj_request_moderation.sql` está versionada e integrada em
  `main`, mas sua aplicação no Supabase remoto não está confirmada. Os 165 testes pgTAP passaram
  no GitHub Actions do PR #3; isso comprova a execução local do workflow, não o estado do banco
  remoto. Nenhuma migration remota foi executada nesta publicação.
- A busca local anterior por “Estação Fandangueira” retornou HTTP 429 no gate diário antigo, antes
  da chamada à YouTube Data API. A migration acima ainda precisa ser validada em Supabase local; não
  há leitura direta das tabelas privadas pelo cliente e o endpoint do contador só retorna agregados.

### Identidade visual das salas

- O tema Synthwave Neon é o padrão das rotas públicas de sala. O artwork aprovado é servido pelo
  asset versionado `public/guest-room-artwork.png` abaixo do botão “Voltar à sala”, antes do rodapé,
  tanto para salas ativas quanto pausadas. O cabeçalho identifica o nome e o código da sala, e não
  oferece navegação administrativa pelo logotipo ou menu. “Voltar à sala” reinicia a experiência do
  convidado na mesma sala sem afetar os pedidos existentes nem a moderação.

### Desenvolvimento local via Wrangler

- `npm run dev` inicia Wrangler Pages Functions em `127.0.0.1:8788` e Vite/HMR em
  `127.0.0.1:3000`; o proxy `/api` encaminha as chamadas às Functions locais. As bindings do servidor
  são lidas de `.dev.vars`, que não deve ser versionado. Não há deploy ou Preview nesse fluxo.
- `npm run dev:mobile -- --room-code <código>` executa um build local inicial, serve a SPA por Vite
  no IPv4 privado selecionado e usa proxy de `/api` para `wrangler pages dev` em `127.0.0.1:8788`.
  O dev server da Function não fica exposto diretamente à LAN; não há deploy nem Preview.
- `scripts/dev-mobile.mjs` exige `.env.local` com as duas variáveis públicas e `.dev.vars` ignorado
  pelo Git com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `YOUTUBE_API_KEY`. O projeto Supabase
  deve ser o mesmo nas duas configurações.
- O QR local aponta para `/sala/<código>` usando HTTP/IP privado e é gravado em `.tmp/`; não altera
  nem substitui o QR de produção. Requests feitos no teste são persistidos. Usar exclusivamente
  sala de teste ativa do próprio DJ, idealmente dedicada, para identificar esses pedidos e permitir
  aprovação com a sessão real do proprietário.

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
- `useRooms` expõe status derivado (carregamento, pronto, erro, ocioso), recarga, criação e
  atualização de status; a UI só reflete a alteração depois da confirmação do store.
- `RoomsSection` renderiza os estados de carregamento, vazio, erro com nova tentativa e a lista
  com selo de status. A validação do nome (2 a 60 caracteres) é local e o servidor revalida pela
  constraint da tabela.
- A Visão Geral mostra contagem e resumo das salas; `/dj/painel/salas` concentra criação, lista,
  ativação/pausa e compartilhamento por link ou QR Code PNG gerado localmente pela biblioteca
  `qrcode`.
- A atualização de status usa a permissão `UPDATE` já concedida para `status`, com a RLS existente
  restringindo a operação às salas do DJ autenticado. A moderação dos pedidos é descrita na Etapa 4B.

### Consulta pública do convidado

- `PublicRoomStore` chama `supabase.rpc('room_by_code_with_membership', { p_code })`; a tabela não concede
  `SELECT` ao papel `anon`.
- A rota `/sala/:roomCode` mantém validação local dos 10 caracteres e busca o código no servidor.
  Exibe apenas nome e estado, com estados distintos para carregamento, código inválido, sala
  inexistente, sala pausada/indisponível e falha de rede com nova tentativa.
- A RPC não exige sessão e expõe somente os campos públicos necessários. Ela permite descobrir
  se um código específico existe; códigos aleatórios e únicos mitigam adivinhação, mas não
  substituem rate limiting, que deverá ser avaliado antes de uso em larga escala.

### Preferências musicais por sala — Etapa 3C

- `rooms` recebe as preferências `surprise_mode` (true), `show_playlist` (false),
  `show_now_playing` (true) e `show_guest_requests` (false). Atualização usa a RLS da sala e grants
  somente para as colunas necessárias ao DJ proprietário autenticado.
- A migration `20261104000000_add_room_music_preferences.sql` foi aplicada ao Supabase remoto.
  `room_by_code` retorna apenas nome, código, estado e esses quatro booleanos; `anon` não recebe
  leitura direta da tabela.
- A tela Salas oferece controles individuais e feedback após confirmação do Supabase. As flags são
  configuração: playlist, player e gestão/visibilidade pública da fila ainda não existem; o envio
  inicial de pedidos da Etapa 4A está integrado, mas gestão posterior continua pendente. Quando
  integrados, Modo
  Surpresa deverá ocultar ordem futura/fila real; a preferência de playlist não concede nem mostra
  ordem de reprodução; pedidos de convidados não confirmam músicas pelo DJ; música atual só poderá
  ser exibida quando houver dado real.
- Os 105 testes pgTAP passaram, incluindo os testes específicos de preferências; os controles
  foram validados localmente. A interface publicada ainda precisa ser confirmada após o deploy.

### Publicação no Cloudflare Pages

- O frontend é um SPA estático do Vite: build `npm run build`, saída `dist/`. A Etapa 4A adiciona
  Pages Functions em `functions/api`. O responsável informa que configurou em Production as
  variáveis públicas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e as bindings de servidor
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`; não verificamos painel nem runtime.
- `public/_redirects` reescreve qualquer caminho para `/index.html` com status 200, para que
  `/dj`, `/dj/cadastro`, `/dj/painel`, `/dj/painel/salas`, `/sala/:roomCode`, `/termos-de-uso` e
  `/privacidade` funcionem no acesso direto e na atualização da página. Sem esse arquivo, o Pages
  responderia 404 nessas rotas.
- `.nvmrc` fixa Node `22.16.0`: o build system do Pages não lê o campo `engines` do
  `package.json` e o Vite 8 exige Node `>=22.12` (o padrão do build system v2 seria 18.x).
- Endereço de produção: `https://project-web-youdj.pages.dev`. Os nomes informados para as cinco
  variáveis correspondem aos bindings usados: as duas `VITE_*` só atendem ao frontend; as três
  sem prefixo são lidas pelas Functions em runtime. `SUPABASE_SERVICE_ROLE_KEY` aceita chave
  legada ou `sb_secret_`, enviada em `apikey` e nunca incluída no bundle.
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
| Supabase PostgreSQL     | Salas (`public.rooms`)                                         | Migrations 3A/3B aplicadas; RLS e RPC verificados |
| Supabase PostgreSQL     | Pedidos pendentes (Etapa 4A)                                   | Migration aplicada; schema/RLS/grants verificados |
| Supabase PostgreSQL     | Pagamentos e histórico                                          | Planejado |
| Supabase Realtime       | Atualização da fila e dos pedidos em tempo real               | Planejado   |
| Cloudflare Pages        | SPA e Pages Functions                                          | Busca real respondeu HTTP 503 genérico; causa upstream não observável na versão publicada |
| APIs de pagamentos      | Pedidos pagos e histórico financeiro                          | Planejado   |
| YouTube IFrame Player API | Reprodução/controle de vídeos e músicas                     | Planejado   |

Supabase Auth, as operações de perfil e o gerenciamento de `public.rooms` estão integrados em
runtime; as migrations `20261102000000` e `20261103000000` foram aplicadas ao remoto. Links/QR e a
RPC pública estão disponíveis com a coluna `code`. O build do
Cloudflare Pages foi refeito após a correção de `VITE_SUPABASE_URL`; o bundle de produção foi
verificado com ambas as variáveis públicas presentes. A validação manual dos fluxos autenticados
e de salas em produção segue pendente.

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

## 8. Fora do escopo da Etapa 4B

- Fila pública, Supabase Realtime, playlist e reprodução.
- Identidades anônimas de convidados e rate limiting.
- Pagamentos.
- Player de música/vídeo.
- Testes end-to-end em navegador.

## 9. Próximos passos recomendados

1. Validar manualmente login/logout, proteção de rota, perfil, criação/listagem/pausa de sala, link,
   QR Code e persistência em produção com uma conta real.
2. Validar cadastro, confirmação de e-mail, login e logout por e-mail/senha, além do isolamento
   entre duas contas de DJs.
3. Publicar/verificar o aplicativo Google OAuth no Google Cloud para liberar login além dos
   usuários de teste.
4. Implementar pedidos com Supabase Realtime.
5. Adicionar player e, depois, pagamentos.
