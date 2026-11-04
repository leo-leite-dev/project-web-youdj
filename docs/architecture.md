# Arquitetura — YouDJ

## 1. Visão geral

O YouDJ será uma plataforma SaaS multi-tenant em que cada DJ gerencia suas próprias salas de
música, pedidos e histórico. Convidados acessam uma sala por link ou QR Code, sem cadastro
obrigatório.

Esta versão entrega a fundação frontend, cadastro/login/logout de DJs com Supabase Auth, leitura
ou criação idempotente do perfil autenticado em `public.dj_profiles`, salas em `public.rooms`,
códigos públicos, links compartilháveis, QR Codes e consulta pública limitada da sala no código.
As migrations de perfil, salas e códigos públicos foram aplicadas ao Supabase remoto. A Etapa 3B
foi verificada por consultas somente de leitura, e os 88 testes pgTAP foram aprovados no GitHub
Actions. A interface autenticada agora possui uma página dedicada ao gerenciamento das salas. O
login com Google foi validado com conta real; os fluxos autenticados completos em produção seguem
aguardando validação manual.

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
| `/dj/painel/salas` | Protegida  | Cria, lista, ativa/pausa e compartilha salas via link e QR Code. |
| `/sala/:roomCode` | Implementada | Consulta pública por código via RPC `room_by_code`. |
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
- `PublicRoomStore` chama a RPC; a página `/sala/:roomCode` distingue código inválido, sala não
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

O convidado já pode acessar por link/QR Code e consultar publicamente o nome e o estado da sala,
sem conta. A Etapa 4A adiciona pedidos sem identidade/login do convidado, limitados no servidor
por endereço observado pelo Cloudflare; isso não equivale a identidade persistente nem impede
abuso distribuído.

### Etapa 4A — pesquisa e pedidos

- A SPA chama somente `POST /api/youtube-search` após submissão explícita e
  `POST /api/guest-requests` para enviar. Cloudflare Pages Functions ficam em `functions/api`;
  Vite não serve essas funções.
- `YOUTUBE_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são bindings de runtime do Pages. O navegador
  nunca recebe chave do YouTube nem credencial privilegiada. O binding Supabase aceita a chave
  legada `service_role` ou a chave moderna `sb_secret_`; as Functions enviam a credencial apenas
  pelo header `apikey`, pois as chaves modernas não são JWTs e não devem ser usadas como
  `Authorization: Bearer`. A chave privilegiada chama RPCs `SECURITY DEFINER` estritamente
  concedidas a `service_role`.
- A RPC valida sala ativa, guarda cache normalizado por 6h, aplica 10 pesquisas/IP/hora e reserva
  atomicamente até 10 chamadas `search.list` sem cache por dia. A documentação atual informa
  padrão de 100 chamadas/dia, 1 unidade por chamada e reset à meia-noite do Pacífico; a configuração
  privada `youtube_search_budget_config.daily_search_limit` permite somente reduzir o teto de 10
  (inclusive bloquear novas consultas sem cache). Confirmar a cota efetiva no Google Cloud antes de habilitar.
  Reservas e cache persistem no PostgreSQL compartilhado entre instâncias; chamadas tentadas contam
  mesmo se a API falhar. O teto é global entre deployments que usam este mesmo banco; se a mesma
  chave Google for reutilizada com bancos independentes, os contadores não se somam. Não reutilizar
  a chave de produção em ambientes isolados sem orçamento compartilhado.
- Fonte: [documentação oficial de custos e cotas](https://developers.google.com/youtube/v3/determine_quota_cost).
  A quota real deve ser conferida no Google Cloud; o limite local não amplia a concessão do Google.
- Pedidos são validados e inseridos no servidor como `pending`, associados à sala e `dj_id`.
  Há limite de 5/IP/10 minutos; nenhuma tabela administrativa concede acesso direto a `anon` ou
  `authenticated`. Na implementação inicial da Etapa 4A, o backend ainda não fazia aprovação,
  fila nem reprodução; a moderação é descrita na Etapa 4B abaixo.
- A tabela de limites guarda SHA-256 do IP recebido do Cloudflare, não o IP bruto. O hash é dado
  pseudonimizado. Migration local `20261106000000_add_guest_data_retention.sql` define a função
  `purge_expired_guest_data()` (pedidos >30 dias, limites >48h, cache vencido e orçamentos >31 dias).
  A migration separada `20261106000001_schedule_guest_data_retention.sql` configura cron horário
  quando `pg_cron` está disponível; cache deixa de ser elegível após 6h, antes da remoção física.
  Execução depende de scheduler e banco ativos: falhas ou pausa do projeto podem atrasar a limpeza.
  O plano Free pode pausar projetos após uma semana sem atividade. Contas e salas não são removidas
  pela rotina.
- Migration local `20261106000002_add_private_guest_receipts_and_consent.sql` troca a RPC para
  exigir código privado e aceite; apenas o hash SHA-256 do código é persistido. Versões dos
  documentos e timestamp são associados ao pedido novo, sem histórico retroativo. O código bruto
  retorna uma única vez pela Pages Function e não há RPC pública de consulta/exclusão. O aceite de
  busca não é persistido; o registro de pedido guarda apenas a declaração enviada junto ao pedido.
- Busca indisponível (chave ausente, cota ou API fora) não bloqueia pedido manual. Link manual é
  opcional e restrito a URLs HTTPS de domínios YouTube conhecidos.
- `surprise_mode` e `show_guest_requests` são preservados; a interface não publica fila nem lista
  de pedidos. O recibo confirma apenas gravação, não aprovação ou reprodução.
- As páginas `/termos-de-uso` e `/privacidade` descrevem o uso da YouTube Data API, dados tratados,
  cache, retenção configurada e o código/aceite dos pedidos. A interface exige aceite antes de
  buscar ou enviar; somente pedidos persistem versão e timestamp. Permanecem pendentes de revisão:
  bases legais, regiões/transferências, política de logs de terceiros e procedimento/prazo de
  atendimento a titulares. Referências: [políticas para clientes
  YouTube](https://developers.google.com/youtube/terms/developer-policies) e [Termos de Serviço do
  YouTube](https://www.youtube.com/t/terms).
- Migration `20261105000000_add_guest_requests_and_youtube_quota.sql` foi aplicada remotamente;
  migrations de retenção, agendamento e recibo/aceite (`20261106000000` a `20261106000002`) são
  locais e ainda não aplicadas.
  O responsável informa que configurou as cinco variáveis em Cloudflare Production, mas o valor e
  funcionamento das bindings não foram verificados remotamente; runtime das Functions e busca real
  do YouTube ainda precisam de validação antes da publicação.

### Etapa 4B — busca visual e moderação

- A interface do convidado pesquisa após pausa de 900 ms (mínimo de três caracteres), mantém botão
  de busca imediata, apresenta miniaturas/título/canal e exige seleção e confirmação antes do envio.
  A função server-side e o cache/orçamento/rate limits da Etapa 4A permanecem a autoridade para
  disponibilidade e cota; o comportamento publicado ainda depende de validação real.
- O recibo privado continua sendo entregue uma vez ao convidado. A confirmação informa recebimento
  pendente, sem prometer aprovação ou reprodução; `video_id` é preservado para futura integração.
- `public.guest_requests` continua sem grants diretos. As RPCs `dj_list_guest_requests()` e
  `dj_set_guest_request_status(uuid,text)` usam `auth.uid()`, rejeitam sessões anônimas e limitam
  a consulta/alteração ao `dj_id` proprietário. A transição só aceita `pending` para `approved` ou
  `rejected`; chamadas concorrentes ou pedidos de outro DJ não alteram linhas.
- A lista do painel separa pendentes e aprovados. Aprovação não cria playlist, fila nem reprodução.
  Realtime continua fora desta etapa e o painel atualiza ao recarregar/decidir.
- Migration `20261107000000_add_dj_request_moderation.sql` e teste pgTAP ficam locais até revisão;
  não foram aplicados ao Supabase remoto. Testes mockados de UI não comprovam RLS nem chamadas
  autenticadas reais.

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

- `PublicRoomStore` chama `supabase.rpc('room_by_code', { p_code })`; a tabela não concede
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
| Cloudflare Pages        | SPA e Pages Functions                                          | SPA publicado; variáveis Production informadas; runtime das Functions não validado |
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
