<div align="center">

# YouDJ

**Sua música. Sua festa. Seu DJ.**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-d97706?style=flat-square)](#estado-atual)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.3.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React%20Router-7.18.5-CA4245?style=flat-square&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0.5-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

Plataforma SaaS de gerenciamento de pedidos musicais para DJs, festas e estabelecimentos.

[Apresentação](#apresentação) · [Como funcionará](#como-funcionará) · [Funcionalidades](#funcionalidades-implementadas) · [Roadmap](#roadmap-de-desenvolvimento) · [Tecnologias](#tecnologias-utilizadas) · [Execução](#instalação-e-execução) · [Segurança](#segurança) · [Estado atual](#estado-atual)

</div>

> **Aviso de escopo:** este repositório está em desenvolvimento. Cadastro/login de DJs,
> proteção do painel, salas com código público, link compartilhável e QR Code estão
> implementados no código com Supabase Auth e RLS. As migrations de perfis, salas, códigos
> públicos, preferências musicais e pedidos da Etapa 4A foram aplicadas ao projeto remoto segundo
> a verificação existente. O responsável confirmou migrations 11–17 pelo comando
> `supabase migration list --remote` e informou que a migration 18 foi aplicada com sucesso pelo
> CLI; esta atualização não executou nem revalidou migrations remotas. Um teste local anterior foi bloqueado pelo orçamento diário interno,
> antes da chamada ao YouTube; as migrations locais removem esse bloqueio e adicionam um contador estimado.
> Elas não foram aplicadas remotamente e a cota personalizada do Google ainda precisa ser
> confirmada. O endpoint
> público atualmente publicado também respondeu HTTP 429 genérico ao teste real; a versão anterior
> não permite identificar o upstream nem comprova resultado do YouTube. Pagamentos seguem
> planejados; o player oficial do YouTube foi integrado localmente à fila, mas sua validação real
> em navegador/dispositivo e a disponibilidade de cada vídeo dependem do YouTube.
> O login com Google foi validado com conta real; a validação manual completa dos fluxos
> autenticados e de salas em produção segue pendente. O último bundle publicado foi verificado
> com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` presentes.

## Apresentação

O **YouDJ** é uma plataforma SaaS de gerenciamento de pedidos musicais que conecta DJs e
convidados. Por meio de links ou QR Codes, os participantes poderão solicitar músicas sem
cadastro obrigatório, enquanto o DJ mantém o controle da fila, das aprovações e das
configurações de cada evento.

O produto será destinado a:

- DJs profissionais.
- Festas particulares.
- Casamentos e aniversários.
- Eventos corporativos.
- Bares e estabelecimentos.

### Problema que pretende resolver

Playlists compartilhadas e pedidos informais por mensagem ou papel geram filas desorganizadas,
pedidos repetidos e pouca visibilidade para o DJ. O YouDJ centraliza a solicitação, a
aprovação e a organização da fila em uma experiência simples para o convidado e controlável
para o DJ.

### Diferencial

O YouDJ não é apenas uma playlist colaborativa. A proposta é oferecer ao DJ controle por
evento: aprovação ou fila automática, configurações de pedidos, histórico e, futuramente,
recursos de interação e monetização. Os convidados participam por link ou QR Code, sem a
obrigação de criar uma conta.

## Como funcionará

> Os fluxos abaixo descrevem a proposta do produto. Eles **não estão integralmente
> implementados** nesta versão.

### Fluxo planejado do DJ

1. Realizar login na área do DJ.
2. Criar uma sala para o evento.
3. Compartilhar o link ou o QR Code da sala.
4. Receber solicitações de músicas dos convidados.
5. Aprovar ou rejeitar pedidos.
6. Organizar a fila manualmente ou habilitar o modo automático.

### Fluxo planejado dos convidados

1. Acessar uma sala por link ou QR Code.
2. Entrar sem necessidade de cadastro.
3. Informar um apelido opcional.
4. Solicitar músicas.
5. Acompanhar o status das solicitações.

## Funcionalidades implementadas

Itens verificados no código atual:

- Fundação frontend com React, Vite e TypeScript em modo strict.
- Tailwind CSS com tokens visuais e layout responsivo mobile-first.
- Cabeçalho mobile da gestão individual de sala com banner YouDJ, navegação para Salas e logout
  acessíveis; o cabeçalho desktop e o card de gerenciamento permanecem preservados.
- SPA com React Router e as rotas públicas, área do DJ e acesso de convidados.
- Landing page com apresentação do produto, proposta de valor e chamadas para ação.
- Cadastro e login de DJs com Supabase Auth, validação local, estados de erro/carregamento e
  confirmação de e-mail quando exigida pelo projeto.
- Login com Google via `signInWithOAuth` nas telas de login e cadastro, com retorno ao destino
  pretendido e mensagens de cancelamento em português.
- Sessão persistente observada por `AuthProvider`; logout e proteção de `/dj/painel`, incluindo
  rejeição de sessões anônimas.
- Criação idempotente e leitura do próprio perfil em `public.dj_profiles`, com RLS como controle
  de acesso no banco.
- Gerenciamento das salas do DJ em `public.rooms` (criação, listagem e ativação/pausa) na rota
  protegida `/dj/painel/salas`, com nome vindo de `dj_profiles.display_name`, CTA “Gerenciar sala”
  e página por sala `/dj/painel/salas/:roomId`. Proprietários e moderadores atribuídos podem abrir
  o gerenciamento; a autorização das operações é feita pelas RPCs e RLS, não pela UI.
- Código público único de 10 caracteres por sala (~52 bits de entropia, gerado no banco e
  imutável pela API), com backfill das salas existentes, link compartilhável `/sala/:codigo` e QR Code gerado
  localmente (sem serviços externos), com cópia do link e download de PNG no painel.
- Página pública que consulta sala por código via RPC limitada, exibe `DJ: [nome]` e informa papel
  owner/moderator/guest; contas autenticadas sem vínculo recebem estado sem permissão, não apelido
  de convidado. O UUID interno só é retornado a membros autenticados da sala.
- Busca visual de vídeos do YouTube iniciada explicitamente pela lupa (digitar não consulta a API),
  com resultados em cache, seleção e confirmação pelo convidado. A seleção e o envio reutilizam o
  resultado já obtido; o pedido manual e o link YouTube opcional continuam disponíveis. Cloudflare
  Pages Functions e RPCs server-side mantêm a tabela inacessível diretamente ao público.
- Gerenciamento por sala com presença e pedidos para proprietário e moderador atribuído; ambos podem
  aprovar/rejeitar pedidos. Somente o proprietário lista, convida e revoga moderadores; convites
  exigem conta Supabase não anônima, confirmada e com perfil. Configurações continuam owner-only.
  Aprovação manual não inicia reprodução.
- Na aba Convidados, o proprietário pode conceder/revogar individualmente “Pedidos sem aprovação”.
  VIPs são identificados por credencial aleatória privada e room-scoped (não pelo apelido/UUID);
  pedidos são aprovados e enfileirados atomicamente no fim, sem interromper a faixa atual. A
  migration `20261115000000_room_guest_vip.sql` consta no histórico remoto confirmado pelo responsável;
  os testes pgTAP correspondentes permanecem versionados no repositório.
- Painel do DJ com pedidos pendentes, aprovação/rejeição e lista separada
  de aprovados e rejeitados por sala, com o apelido associado a cada pedido.
- Aba “Fila e Player” no gerenciamento de cada sala: pedidos aprovados entram uma única vez no fim
  da fila; DJ pode reordenar/remover sem alterar o status do pedido. O player oficial do YouTube
  oferece “Tocando agora” com capa, título, artista, convidado e status; a lista abaixo mostra apenas
  as próximas músicas, numeradas a partir de 01. O player oferece início por ação do DJ, pausa,
  próxima música e avanço automático ao término. Vídeos indisponíveis e bloqueios de autoplay recebem
  feedback; o cursor da fila continua local à sessão. O iframe permanece montado e visível, em modo
  completo na fila e em mini-player no painel quando fora dela, sem reiniciar ao navegar entre
  abas/páginas. O histórico persistente registra o ID individual do pedido quando o player emite
  `PLAYING`; Aprovados atualiza automaticamente e mantém “Tocada” após término e recarga. O estado
  do player/progresso não é sincronizado entre dispositivos. O responsável confirmou migrations
  11–17 no remoto com `supabase migration list --remote`.
- Na mesma aba, o DJ pode pesquisar vídeos do YouTube e incluí-los diretamente na fila, sem criar
  pedido de convidado. A busca reutiliza a Pages Function e sua chave permanece no servidor; a RPC
  autenticada e a migration `20261117000000_add_dj_youtube_tracks_to_queue.sql` estão confirmadas
  no histórico remoto segundo o responsável.
- Convidado informa nome ou apelido no primeiro acesso. Um identificador aleatório é reutilizado
  somente no mesmo navegador; não há conta, e-mail ou senha, e o apelido não é identidade verificada.
  Heartbeats mantêm presença por sala, expirada após 90 segundos sem atividade.
- A interface “Meus pedidos” acompanha os estados existentes usando comprovantes privados como prova
  de posse, sem confiar no `guest_id`; os códigos são guardados por sala no navegador e podem ser
  importados. A RPC server-side requer a migration
  `20261113000000_guest_request_status_by_receipt.sql`, cuja aplicação consta no histórico remoto
  confirmado pelo responsável via `supabase migration list --remote`.
- A migration `20261112000000_room_moderators_and_permissions.sql` adiciona membership privado
  por sala e RPCs com verificação server-side owner/moderator. A migration 11, requisito anterior,
  também consta como aplicada no histórico remoto segundo o responsável. Para compatibilidade
  transitória, a migration 11 mantém a RPC legada
  `submit_guest_request` aceitando pedidos sem identidade verificada; a migration 12 preserva
  `room_by_code` e adiciona `room_by_code_with_membership` para a interface nova.
- Tema Synthwave Neon padrão nas salas públicas, com artwork definitivo em
  `public/guest-room-artwork.png`, abaixo da ação de retorno da sala. O cabeçalho exibe o nome da
  sala e seu código, sem atalhos administrativos na experiência de convidado.
- Histórico: um gate diário anterior impedia buscas ao atingir o teto interno. A nova migration local
  remove o bloqueio diário e usa a configuração `daily_search_quota` (padrão 100) somente como
  denominador do contador estimado; o Google continua controlando a cota real. O contador registra
  chamadas `search.list` iniciadas pelo YouDJ, não consultas atendidas pelo cache nem pedidos; a
  cota personalizada do projeto Google Cloud deve ser confirmada antes de produção.
- Tela de link inválido para códigos de sala malformados.
- Página 404 para rotas desconhecidas.
- ESLint, Vitest, Testing Library e jsdom configurados.
- Cliente Supabase centralizado, com validação das variáveis públicas e criação sob demanda.
- Testes essenciais para a página inicial, a rota de convidados, as regras de código de sala, a
  configuração do cliente Supabase, os fluxos de autenticação/perfil, a criação/listagem de
  salas, o compartilhamento (link/QR) e a página do convidado, com doubles simulados.
- Scripts de typecheck, lint, teste, build e preview.

### Banco de dados inicial (aplicado no remoto)

Os arquivos abaixo existem no repositório e a migration inicial foi aplicada ao projeto remoto:

- Migration `supabase/migrations/20261031000000_create_dj_profiles.sql`, que cria
  `public.dj_profiles` vinculada a `auth.users`, com `display_name` validado, timestamps e
  trigger de atualização.
- Row Level Security (RLS) habilitada, permissões mínimas para `authenticated`, bloqueio de
  `anon` e de convidados anônimos, leitura/escrita restrita ao próprio DJ e ausência de
  exclusão pela API.
- Suíte pgTAP `supabase/tests/dj_profiles_rls.test.sql` com 28 asserções para permissões,
  isolamento, constraints, integridade referencial e cascade.

Migration da Etapa 3B aplicada ao Supabase remoto:

- Migration `supabase/migrations/20261103000000_add_rooms_public_code.sql`, que adiciona o
  código público de 10 caracteres (`A-Z0-9`, ~52 bits de entropia) às salas existentes, com
  backfill preservando registros e timestamps, gerador no banco, trigger de preenchimento,
  constraints de unicidade/formato e função pública `room_by_code` (retorna apenas `code`,
  `name` e `status`, com `security definer` e `search_path` travado).
- Suíte pgTAP `supabase/tests/rooms_public_code.test.sql` com 27 asserções de privilégios da
  nova coluna, menor privilégio das funções, geração de código, imutabilidade e comportamento da
  consulta pública.

A migration `20261102000000_create_rooms.sql` foi aplicada ao projeto remoto em 2026-11-02 com
`supabase db push --linked --skip-vault`; o histórico remoto registra as versões `20261031000000`
e `20261102000000`, e `public.rooms` foi verificada por consultas somente leitura (tabela, RLS,
políticas, privilégios, constraints, FK e dados preservados). A suíte pgTAP é executada em um
Supabase local no workflow do GitHub Actions, sem projeto remoto.

A migration `20261103000000_add_rooms_public_code.sql` também foi aplicada ao projeto remoto do
YouDJ. A coluna `rooms.code`, os códigos existentes, a função `room_by_code`, suas permissões e
as políticas RLS foram confirmadas por consultas somente de leitura. Os 88 testes pgTAP da Etapa
3B foram aprovados no GitHub Actions.

### Rotas atuais

| Rota              | Estado       | Comportamento atual                                                    |
| ----------------- | ------------ | ---------------------------------------------------------------------- |
| `/`               | Implementada | Página inicial e apresentação do produto.                              |
| `/dj`             | Implementada | Login de DJ via Supabase Auth (e-mail ou Google).                       |
| `/dj/cadastro`    | Implementada | Cadastro de DJ; pode exigir confirmação de e-mail ou usar Google.          |
| `/dj/painel`      | Protegida    | Resumo de salas e gestão de pedidos autorizada no backend. |
| `/dj/painel/salas` | Protegida   | Cria, lista, ativa/pausa e compartilha salas via link e QR Code; “Entrar na sala” e “Gerenciar”. |
| `/dj/painel/salas/:roomId` | Protegida | Código local oferece gestão de presença/pedidos, moderadores, fila por sala, busca e player oficial; autorização é por RPC owner/moderator. A disponibilidade remota das migrations exigidas ainda precisa ser confirmada. |
| `/sala/:roomCode` | Implementada | Solicita apelido no primeiro acesso; busca YouTube explícita, cache, contador e pedidos (requer backend). |
| `/termos-de-uso` / `/privacidade` | Implementadas | Rascunhos informativos públicos; aprovação jurídica pendente. |
| `*`               | Implementada | Página 404.                                                             |

O painel por sala e os fluxos de fila/player estão implementados no código desta branch. Isso não
comprova que o backend remoto esteja pronto: a documentação de release ainda registra migrations
de pedidos, membership, VIP, fila e histórico como locais ou pendentes de aplicação/validação. O
responsável confirmou a aplicação remota da migration de exclusão de salas (`20261118000000`), mas
esta tarefa não executou migrations. Não publicar os fluxos que dependem dessas RPCs até verificar
o estado remoto em modo somente leitura e resolver as migrations pendentes por autorização própria.

### O que ainda não está implementado

- Recuperação de senha e gestão de e-mail/senha.
- Supabase Realtime; o painel atualiza pedidos por polling. O histórico de reprodução está
  implementado no código, mas sua migration/RPC remota ainda não está comprovada.
- Vínculo manual de identidades (Google e e-mail/senha) quando o Supabase não faz o
  vínculo automático por e-mail verificado.
- Contas e identidades verificadas de convidados. O apelido e o ID aleatório do navegador servem
  somente para mostrar quem enviou um pedido e manter presença aproximada; não autenticam ninguém.
- Pagamentos e histórico financeiro.
- Validação real do player em navegador e das restrições aplicadas pelo YouTube em cada vídeo.
- Validação manual dos fluxos autenticados em produção (o build publicado em 2026-11-02 já
  contém ambas as variáveis públicas do Supabase).

## Roadmap de desenvolvimento

### Fase 1 — Fundação · Concluída

- Inicialização do projeto.
- Frontend React e TypeScript.
- Roteamento.
- Interfaces iniciais.
- Documentação e testes.

### Fase 2 — Banco de dados e autenticação · Em andamento

- Migration inicial de `public.dj_profiles` com RLS e testes pgTAP, aplicada ao projeto remoto
  e verificada por consultas somente leitura.
- Cadastro/login/logout de DJs e proteção do painel com Supabase Auth (implementado; login com
  Google validado com conta real; fluxos de e-mail/senha com conta remota pendentes).
- Login com Google (`signInWithOAuth`), com retorno ao destino pretendido e tratamento de
  cancelamento em português (validado com conta real no domínio de produção).
- Criação/leitura idempotente do perfil autenticado em `public.dj_profiles`.
- Validação de RLS remota com fluxos autenticados reais (parcial: login Google; isolamento entre
  DJs ainda não exercitado).
- Próximas tabelas de domínio no Supabase PostgreSQL.
- Integração futura com autenticação unificada, se aprovada.
- Aplicação inicial do modelo SaaS multi-tenant em `dj_profiles`.
- RLS aplicada ao perfil e às salas; políticas das tabelas futuras ainda serão definidas e
  testadas.
- Isolamento entre DJs aplicado a perfis e salas; pedidos dependem das tabelas futuras.

### Fase 3 — Salas e convidados · Em andamento

- Criação e listagem de salas com isolamento por DJ (implementado; migration aplicada ao remoto).
- Links exclusivos e QR Codes por sala (implementado; migration dos códigos aplicada ao remoto).
- Acesso público do convidado ao nome e ao estado da sala; primeiro acesso pede nome/apelido, sem
  conta. A presença usa heartbeats de 30 segundos e expira após 90 segundos de inatividade.
- A listagem de participantes e pedidos é por sala; a migration `20261111000000_guest_identity_presence_room_management.sql` foi confirmada no histórico remoto pelo responsável.
- Papéis owner/moderator por sala, convites e revogações owner-only, e autorização server-side estão
  implementados na migration `20261112000000_room_moderators_and_permissions.sql`; a migration
  `20261111000000` consta como aplicada em sequência no histórico remoto segundo o responsável.

### Fase 4 — Pedidos musicais · Em andamento (Etapa 4B implementada)

- Pesquisa de vídeos no YouTube sob ação explícita da lupa e pedido manual via Pages Functions. A
  migration local remove o bloqueio diário e acrescenta contador global estimado por dia do Pacífico;
  o cache é preservado e pedidos não contam como buscas.
- Persistência de pedidos pendentes vinculados à sala, com validação e rate limits no servidor
  (migration aplicada e banco verificado; suíte pgTAP de 154 asserções).
- Etapa 4B: busca visual acionada pela lupa e confirmação pelo convidado; digitar não chama a API.
  Cada sala tem pedidos pendentes, aprovados e rejeitados, com moderação e apelido do convidado;
  `/dj/painel` redireciona para Salas e não há página Visão geral. RPCs verificam o proprietário no banco. Os 165
  testes pgTAP passaram no GitHub Actions do PR #3. A migration
  `20261107000000_add_dj_request_moderation.sql` consta no repositório, mas sua aplicação remota
  não está confirmada; não foi aplicada nesta tarefa. Esta versão classifica erros da Function
  para diagnóstico mais específico sem revelar credenciais ou corpos do provedor.
- Termos de Uso e Política de Privacidade em rascunho, com aceite obrigatório no fluxo do convidado;
  precisam de revisão e aprovação antes da publicação.
- Fila livre/automática (a Etapa 1 atual cobre somente a fila gerenciada pelo DJ).
- Reorganização de pedidos.
- Atualizações em tempo real.
- Prevenção de músicas repetidas.

### Fase 5 — Reprodução musical · Planejada

- Integração opcional com provedores autorizados.
- Avaliação da YouTube IFrame Player API.
- Controle de reprodução quando permitido.
- Estratégias de redução do consumo de cotas de pesquisa.
- Tratamento de vídeos indisponíveis.

> A pesquisa no YouTube não é ilimitada. A reprodução deverá respeitar as condições dos
> fornecedores e os direitos musicais aplicáveis.

### Fase 6 — Interatividade · Planejada

- Votação nas músicas.
- Ranking.
- Dedicatórias.
- Modo telão.
- Estatísticas de eventos.
- Configurações de cada DJ.

### Fase 7 — Monetização · Planejada

- Pedidos gratuitos ou pagos.
- Integração com Pix.
- Configuração de valores por DJ.
- Contas de recebimento.
- Confirmação segura de transações.
- Histórico financeiro.
- Tratamento de reembolsos.

> A implementação de pedidos pagos dependerá de validação técnica, contratual e jurídica,
> especialmente quando houver integração com plataformas musicais.

## Tecnologias utilizadas

Versões verificadas nos arquivos instalados em `node_modules` e declaradas em
`package.json` / `package-lock.json`.

| Tecnologia                | Versão | Finalidade                                      |
| ------------------------- | ------ | ----------------------------------------------- |
| React                     | 19.3.1 | Construção da interface e composição de componentes |
| React DOM                 | 19.3.1 | Renderização da aplicação no navegador          |
| React Router DOM          | 7.18.5 | Roteamento da SPA                               |
| @supabase/supabase-js     | 2.118.0 | Autenticação, perfil e salas tipados            |
| qrcode                    | 1.5.4   | Geração local de QR Codes (sem serviços externos) |
| TypeScript                | 5.9.3  | Tipagem estática em modo strict                 |
| Vite                      | 8.3.5  | Servidor de desenvolvimento e build             |
| @vitejs/plugin-react      | 6.1.2  | Integração do React ao Vite                     |
| Tailwind CSS              | 4.3.3  | Estilos utilitários e responsividade            |
| @tailwindcss/vite         | 4.3.3  | Integração do Tailwind ao Vite                  |
| ESLint                    | 10.14.0 | Análise estática do código                     |
| Vitest                    | 5.0.5  | Execução dos testes automatizados               |
| Testing Library React     | 16.3.3 | Testes de componentes e comportamento           |
| Testing Library jest-dom  | 7.0.1  | Matchers de DOM nos testes                      |
| jsdom                     | 30.1.3 | Ambiente DOM para os testes                     |

### Requisitos de ambiente

- Node.js `>=22.12.0`. O SDK atual do Supabase exige Node.js 22 ou superior. O arquivo `.nvmrc`
  fixa `22.16.0`, a versão usada também no build do Cloudflare Pages.
- npm 10 ou superior.

### Serviços — estado atual

| Serviço                    | Uso planejado                                      | Estado    |
| -------------------------- | -------------------------------------------------- | --------- |
| Supabase Auth              | Login de DJs (e-mail/senha e Google)                 | Implementado; Google validado com conta real |
| Supabase Auth              | Identidades anônimas de convidados                 | Planejado |
| Supabase PostgreSQL        | Perfil de DJ (`public.dj_profiles`)                | Implementado; leitura/criação exercitadas no login Google real |
| Supabase PostgreSQL        | Salas (`public.rooms`)                             | Implementado; migrations 3A/3B aplicadas e verificadas |
| Supabase PostgreSQL        | Pedidos pendentes (Etapa 4A)                        | Migration aplicada; schema/RLS/grants verificados |
| Supabase PostgreSQL        | Histórico e pagamentos                              | Planejado |
| Supabase Realtime          | Atualização da fila e dos pedidos em tempo real    | Planejado |
| Cloudflare Pages           | Hospedagem do frontend estático                    | Deploy publicado; variáveis públicas verificadas no bundle |
| YouTube IFrame Player API  | Reprodução e controle de vídeos, quando permitido  | Planejado |
| Provedor de pagamentos Pix | Pedidos pagos, confirmação e histórico financeiro  | Planejado |

O SDK `@supabase/supabase-js` está instalado e o cliente é criado sob demanda em
`src/integrations/supabase/client.ts`, com tipos de `dj_profiles` e `rooms` e validação das
variáveis públicas. Autenticação, perfil e criação/listagem de salas são usados em runtime. A
consulta pública da interface nova usa `room_by_code_with_membership`; a RPC legada `room_by_code`
mantém seu contrato para o frontend publicado. As Pages Functions chamam Supabase e YouTube no servidor.
Uma busca real publicada respondeu HTTP 503 genérico; a versão anterior não permitiu confirmar a
causa upstream. O código local agora expõe categorias seguras de diagnóstico, ainda sem validação
com credenciais reais.

## Arquitetura

- Aplicação SPA em React e TypeScript, empacotada pelo Vite.
- Interface separada entre área pública, área do DJ e área de convidados.
- Componentes reutilizáveis em `src/components` e layouts em `src/layouts`.
- Regras testáveis isoladas em `src/features/*/lib`.
- Roteamento centralizado em `src/routes`.
- `AuthProvider` observa a sessão Supabase; `RequireDjAuth` protege o painel e exige um perfil
  carregado. O guard de frontend complementa, mas não substitui, a RLS.
- Cliente Supabase centralizado em `src/integrations/supabase/client.ts`, criado sob demanda
  com validação das variáveis públicas.
- A primeira tabela multi-tenant, `public.dj_profiles`, usa RLS para limitar a leitura/escrita ao
  usuário autenticado correspondente a `auth.uid()`.
- Auth e autorização de perfis usam Supabase; a RLS no banco é a autoridade, não o guard do
  frontend. Políticas das futuras tabelas ainda serão implementadas.
- Atualização da fila em tempo real planejada com Supabase Realtime.

A descrição completa, incluindo o conceito multi-tenant e as integrações previstas, está em
[`docs/architecture.md`](docs/architecture.md).

## Estrutura do projeto

```text
.
├── .env.example
├── .nvmrc
├── .opencode/
│   └── agents/
│       └── normandy.md
├── docs/
│   └── architecture.md
├── public/
│   ├── _redirects
│   └── favicon.svg
├── src/
│   ├── app/
│   │   └── App.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── RequireDjAuth.tsx
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── services/
│   │   ├── rooms/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── roomTypes.ts
│   │   │   └── services/
│   │   └── guest/
│   │       └── lib/
│   │           ├── roomCode.test.ts
│   │           └── roomCode.ts
│   ├── components/
│   │   ├── Brand.tsx
│   │   ├── Icons.tsx
│   │   └── PlannedBadge.tsx
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.test.ts
│   │       ├── client.ts
│   │       └── database.types.ts
│   ├── layouts/
│   │   ├── DjLayout.tsx
│   │   └── PublicLayout.tsx
│   ├── pages/
│   │   ├── dj/
│   │   │   ├── DjDashboardPage.tsx
│   │   │   ├── DjLoginPage.tsx
│   │   │   └── DjSignUpPage.tsx
│   │   ├── guest/
│   │   │   ├── GuestRoomPage.test.tsx
│   │   │   └── GuestRoomPage.tsx
│   │   ├── HomePage.test.tsx
│   │   ├── HomePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── routes/
│   │   └── AppRoutes.tsx
│   ├── styles/
│   │   └── index.css
│   ├── test/
│   │   ├── authTestDoubles.ts
│   │   ├── roomTestDoubles.ts
│   │   └── setup.ts
│   ├── vite-env.d.ts
│   └── main.tsx
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20261031000000_create_dj_profiles.sql
│   │   ├── 20261102000000_create_rooms.sql
│   │   └── 20261103000000_add_rooms_public_code.sql
│   └── tests/
│       ├── dj_profiles_rls.test.sql
│       ├── rooms_public_code.test.sql
│       └── rooms_rls.test.sql
├── .github/
│   └── workflows/
│       └── supabase-tests.yml
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── eslint.config.js
├── index.html
├── opencode.json
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Instalação e execução

### Clonar o repositório

```bash
git clone https://github.com/leo-leite-dev/project-web-youdj.git
cd project-web-youdj
```

### Instalar dependências

```bash
npm install
```

### Configurar o Supabase

1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores públicos do
   projeto no painel do Supabase.
3. Não utilize `service_role`, secret keys ou a senha do banco no frontend.
4. Mantenha `.env.local` fora do Git; o arquivo já é ignorado.

### Etapa 4A — pedidos e pesquisa do YouTube

- `functions/api/youtube-search.ts` e `functions/api/guest-requests.ts` são Cloudflare Pages
  Functions. Configure no runtime do Pages as secrets `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` e, para habilitar a busca, `YOUTUBE_API_KEY`. **Nunca** use prefixo
  `VITE_` para essas chaves. `SUPABASE_SERVICE_ROLE_KEY` pode conter a chave legada `service_role`
  ou a chave moderna `sb_secret_`; as Functions enviam a chave somente no header `apikey`, pois
  `sb_secret_` não é JWT e não deve ser enviado como `Authorization: Bearer`. Essa credencial é
  privilegiada e deve existir somente no servidor. `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` são públicas e destinadas ao bundle.
- A migration de pedidos foi aplicada e verificada no Supabase remoto segundo os registros
  existentes; a migration de moderação (`20261107000000`) e as migrations locais de quota estimada
  (`20261109000000` e `20261110000000`) seguem versionadas, sem confirmação de aplicação remota.
  Diagnósticos anteriores no deployment público
  retornaram HTTP 503/429 genéricos e não identificam a causa upstream. Um teste local antigo também
  foi barrado pelo orçamento diário artificial, antes de chegar ao YouTube. A integração real e o
  contador precisam ser revalidados após a migration e o deploy autorizados.
- Sem `YOUTUBE_API_KEY`, a função informa erro de configuração e mantém disponível o pedido manual.
  O cache é de 6h; pedidos continuam limitados a 5/IP/10 min. Não há bloqueio diário local nem limite
  individual de pesquisas por IP/usuário. O contador global mostra chamadas `search.list` iniciadas
  pelo YouDJ no dia de cota do Pacífico, e a quota configurável `youtube_search_budget_config.daily_search_quota`
  (padrão inicial 100) serve apenas como referência visual. Cache hits e pedidos não incrementam o
  número. A documentação do YouTube informa quota padrão de 100 chamadas/dia, 1 unidade por chamada
  e reset à meia-noite do Pacífico; confirme a quota efetiva do projeto Google Cloud. O contador é
  uma estimativa interna, não medição oficial do Google.

### Teste local pelo celular (Vite + Wrangler)

- `npm install` instala Wrangler como dependência de desenvolvimento. `npm run dev:mobile --
  --room-code CODIGO` compila a SPA, inicia Pages Functions localmente em `127.0.0.1:8788` e Vite
  somente no IP privado escolhido da LAN, na porta `5173`; o proxy `/api` leva as chamadas reais
  do navegador ao Wrangler. Não publica nem configura Preview/Production.
- Configure `.env.local` com as variáveis públicas `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`. Copie `.dev.vars.example` para `.dev.vars` (ignorado pelo Git)
  e preencha `SUPABASE_URL` do mesmo projeto, `SUPABASE_SERVICE_ROLE_KEY` e `YOUTUBE_API_KEY`.
  Nunca coloque as duas chaves de servidor em `VITE_*`, não as cole em conversas e não versione
  `.dev.vars`.
- Use somente uma sala ativa de teste pertencente à sua conta de DJ (idealmente uma sala dedicada,
  por exemplo “Teste celular”). O fluxo de convidado grava pedidos reais nessa sala e o painel
  autenticado do mesmo DJ permite aprovar/rejeitar; os pedidos de teste ficam identificados pela
  sala dedicada. Não use sala de outro DJ. A busca usa o cache/orçamento reais do Supabase e a chave
  real do YouTube; cada busca inédita pode consumir uma unidade e o YouDJ registra a chamada iniciada
  no contador estimado, inclusive quando a resposta upstream falha.
- O script seleciona um IPv4 privado da máquina, gera QR/PNG em `.tmp/youdj-dev-room-qr.png` e
  não altera o QR de produção. A porta das Functions é loopback; a SPA só é acessível na LAN.
  Celular e Windows devem estar na mesma Wi-Fi; mantenha o Windows Defender Firewall restrito à
  rede privada e não configure port-forwarding. Se houver mais de uma interface, passe `--ip`.
- A migration local de retenção define exclusão de pedidos após 30 dias, limites após 48 horas,
  cache fisicamente expirado e contadores após 31 dias. O cache deixa de ser elegível após 6h; a
  limpeza física é agendada de hora em hora via pg_cron quando a extensão está disponível. A rotina
  separada pode ser testada sem o agendador. Pausa do banco, indisponibilidade ou falhas podem atrasar
  a execução; os prazos não são garantias de remoção exata. No plano Free, projetos podem pausar após
  uma semana sem atividade, o que também pode atrasar o cron.
- Cada pedido guarda SHA-256 de um código privado aleatório de 256 bits. O código bruto é exibido na
  resposta do envio e não é consultável no backend; o convidado deve guardá-lo para pedir exclusão
  manualmente pelo e-mail. O pedido grava versões dos Termos/Política e horário do aceite; buscas
  não geram registro persistente de aceite. A rotina não remove contas nem salas dos DJs.
- Referências: [custos e cotas da API](https://developers.google.com/youtube/v3/determine_quota_cost)
  e [políticas para desenvolvedores](https://developers.google.com/youtube/terms/developer-policies).
  Páginas de [Termos de Uso](/termos-de-uso) e [Política de Privacidade](/privacidade) estão
  preparadas com aceite na área do convidado. São rascunhos: identidade/contato do controlador,
  retenção e requisitos jurídicos ainda precisam de revisão e aprovação antes da publicação.

O cadastro/login de DJs e a leitura/criação do próprio perfil estão ativos. No projeto remoto
atual, a confirmação de e-mail está habilitada e o `site_url` é `https://project-web-youdj.pages.dev`;
para testar localmente o retorno do e-mail e o login com Google, execute
`npm run dev` (Vite em `127.0.0.1:3000`, porta autorizada no painel do Supabase). O script também
inicia o Wrangler Pages Functions em `127.0.0.1:8788` para as rotas `/api`. Depois de
confirmar, acesse `/dj` para entrar. Não altere URLs de redirecionamento no Supabase sem
autorização.

### Login com Google

O botão "Continuar com Google" usa `supabase.auth.signInWithOAuth({ provider: 'google' })` e o
retorno acontece na raiz do domínio atual (`window.location.origin`). A URL de retorno precisa
estar autorizada em **Authentication > URL Configuration** do Supabase. No projeto atual:

| Ambiente            | URL autorizada                                  |
| ------------------- | ----------------------------------------------- |
| Local               | `http://localhost:3000/**`                     |
| Cloudflare Pages    | `https://project-web-youdj.pages.dev/**`        |

Pontos importantes:

- Em desenvolvimento local use a porta `3000`; em `127.0.0.1` ou outra porta o Supabase rejeita
  o retorno, e a aplicação informa isso antes de iniciar o fluxo.
- Se o domínio de produção mudar, defina `VITE_SUPABASE_OAUTH_REDIRECT_URL` com a URL
  autorizada ou atualize as URLs no painel do Supabase.
- O destino final (por exemplo `/dj/painel`) é resolvido no cliente após o retorno, o que evita
  depender de rota profunda na allowlist e funciona igual em localhost e no Cloudflare Pages.
- Não é solicitada nenhuma permissão adicional do Google além de `email profile`.
- O aplicativo Google OAuth está em **modo de teste** no Google Cloud: somente contas adicionadas
  como usuários de teste concluem o login com Google. Isso não afeta o login por e-mail/senha nem
  impede publicar o site; liberar o público em geral exige publicar/verificar o aplicativo no
  Google Cloud (configuração remota, fora deste repositório).

### Executar em desenvolvimento

```bash
npm run dev
```

O script inicia Wrangler Pages Functions em `127.0.0.1:8788` e Vite/HMR em
`http://localhost:3000`; o proxy `/api` encaminha ao Wrangler. Os bindings locais de servidor são
lidos de `.dev.vars` (ignorado pelo Git). Para desenvolvimento sem usar as Functions, não há um
modo alternativo implícito: mantenha ambas as partes em execução pelo script.

> No Windows com PowerShell e política de execução restritiva, utilize `npm.cmd` no lugar de
> `npm`.

### Build de produção

```bash
npm run build
```

O resultado é gerado em `dist/`, incluindo `public/_redirects`, que faz o Cloudflare Pages
responder as rotas internas da SPA (`/dj`, `/dj/cadastro`, `/dj/painel`, `/sala/:roomCode`)
também no acesso direto ou após atualizar a página.

### Prévia do build

```bash
npm run preview
```

## Scripts disponíveis

| Comando              | Descrição                                          |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Inicia Vite/HMR em `localhost:3000` e Wrangler Pages Functions em `127.0.0.1:8788`. |
| `npm run typecheck`  | Executa a verificação de tipos com TypeScript.     |
| `npm run lint`       | Executa a análise estática com ESLint.             |
| `npm run test`       | Executa os testes automatizados uma vez.           |
| `npm run test:watch` | Executa os testes em modo observação.              |
| `npm run build`      | Verifica os tipos e gera o build de produção.      |
| `npm run preview`    | Serve localmente o build de produção.              |

## Testes e qualidade

Os testes atuais cobrem a apresentação da página inicial, os estados da rota de convidados, as
regras de normalização e validação do código de sala, a configuração do cliente Supabase, os
fluxos de validação, sessão, rota protegida e criação de perfil com doubles simulados, além da
criação/listagem de salas, do compartilhamento (link e QR Code) e da página pública do
convidado. A suíte é executada por arquivo; a etapa 3B validou os 41 testes novos e afetados.

A suíte pgTAP tem 154 asserções: 28 em `dj_profiles_rls.test.sql`, 33 em `rooms_rls.test.sql`,
27 em `rooms_public_code.test.sql`, 17 em `room_music_preferences.test.sql` e 49 em
`guest_requests_security.test.sql`, incluindo os testes de segurança da Etapa 4A. Ela é executada
em um Supabase local isolado pelo workflow, pois este ambiente local não possui Docker nem
PostgreSQL.

| Verificação         | Finalidade                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `npm run typecheck` | Garante que o código respeita o TypeScript em modo strict.        |
| `npm run lint`      | Detecta problemas de padrão, consistência e possíveis erros.      |
| `npm run test`      | Executa a suíte Vitest com Testing Library e jsdom.               |
| `npm run build`     | Valida os tipos e gera os arquivos estáticos de produção.         |

### Testes de banco no GitHub Actions

O workflow [`.github/workflows/supabase-tests.yml`](.github/workflows/supabase-tests.yml) é
acionado em Pull Requests para `main` que alterem `supabase/**` ou o próprio workflow, além de
execução manual. Ele usa o Supabase CLI `2.122.0` e executa apenas o stack local do runner:

1. `supabase start`
2. `supabase db reset --local --no-seed --yes`
3. `supabase test db --local supabase/tests`

O workflow não usa `--linked`, credenciais de produção ou o projeto remoto. As 154 asserções
pgTAP, incluindo a Etapa 4A, são executadas em cada Pull Request que altera `supabase/**`.

## Segurança

### Proteções existentes

- `.gitignore` cobre dependências, builds, cobertura, logs, variáveis de ambiente e arquivos
  temporários.
- Login/cadastro usam somente a publishable key e as variáveis públicas do cliente Supabase.
- O login com Google usa apenas o escopo padrão `email profile` e não solicita permissões
  adicionais ao Google.
- A proteção visual do painel é complementada pela RLS em `public.dj_profiles`; não é a única
  barreira de autorização.
- Somente a publishable key pode ser usada no frontend. `service_role`, secret keys e a senha
  do banco nunca devem ser expostas ao cliente.
- Nenhuma autenticação fictícia, transação simulada ou dado de pagamento é processado.
- O cliente valida o formato do código e o banco aplica constraint de 10 caracteres `A-Z0-9`;
  a existência da sala só é confirmada pela RPC pública de lookup.
- Segredos não devem ser expostos no frontend nem versionados.
- A migration de `public.dj_profiles` define RLS, permissões mínimas, isolamento por
  `auth.uid()` e bloqueio de convidados anônimos. Ela foi aplicada ao banco remoto; políticas e
  privilégios foram verificados por consultas somente leitura.
- A migration de `public.rooms` aplica o mesmo padrão: RLS de proprietário (`dj_id = auth.uid()`
  e `is_anonymous` falso), privilégios por coluna, sem `DELETE` pela API e cascade por
  `dj_profiles`. Foi aplicada ao remoto em 2026-11-02 e verificada por consultas somente
  leitura, com 33 asserções pgTAP.
- A consulta pública de salas (`room_by_code`) é uma função `security definer` com `search_path`
  travado que devolve **apenas** `code`, `name` e `status`; o papel `anon` continua sem nenhum
  privilégio sobre a tabela, e o código só pode ser lido/alterado pelo proprietário (gerado no
  banco, sem `INSERT`/`UPDATE` na API). A migration `20261103000000` está aplicada no remoto e as
  permissões/schema foram confirmadas por consulta; os 88 testes pgTAP passaram no GitHub Actions.
- Os QR Codes são gerados **localmente** no navegador (biblioteca `qrcode`, sem serviços
  externos); nenhum link ou dado de sala é enviado a terceiros.

### Práticas planejadas

- Isolamento dos dados de cada DJ por `dj_id` e Row Level Security no PostgreSQL.
- Autorização validada no backend e no banco, não apenas na interface.
- Identidades anônimas controladas para convidados, com proteção contra spam.
- Validação segura de pagamentos e confirmação de transações no servidor.
- Chaves com privilégio de serviço mantidas fora do cliente.
- Revisão de permissões e políticas antes de qualquer dado real.

## Publicação

- **Repositório oficial:** <https://github.com/leo-leite-dev/project-web-youdj>
- **Branch principal:** `main`
- **Endereço de produção:** <https://project-web-youdj.pages.dev>
- **Estado atual:** variáveis públicas do Supabase configuradas no Cloudflare Pages. Após a
  correção de `VITE_SUPABASE_URL`, o build publicado foi verificado em 2026-11-02 contendo
  **ambas** as variáveis no bundle (comparadas com a `.env.local`, sem exibir valores); a
  validação manual dos fluxos autenticados em produção segue pendente.
- **Cloudflare Pages:** projeto preparado para o build estático do Vite (comando `npm run build`,
  saída `dist/`). `public/_redirects` garante as rotas internas da SPA e `.nvmrc` fixa o Node
  `22.16.0`, pois o build system do Pages não lê o campo `engines` do `package.json` e o Vite 8
  exige Node `>=22.12`.
- **Antes do próximo deploy:** confirmar no painel do Cloudflare o comando de build
  (`npm run build`), o diretório de saída (`dist`), a versão do Node (`22+`, padrão do build
  system v3 ou a variável de build `NODE_VERSION`) e a presença de `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` no escopo de produção (a URL faltou no build de 2026-11-02).
  Nenhuma variável secreta deve ser criada no Cloudflare; apenas `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`, que são públicas por definição.

## Estado atual

### Entregas concluídas

- Fundação React, Vite e TypeScript strict.
- Tailwind CSS e layout responsivo.
- Rotas públicas, cadastro/login de DJs, painel protegido e acesso de convidados por código.
- Validação local do formato do código de sala.
- Cliente Supabase centralizado e tipado; cadastro/login/logout de DJs, sessão, perfil próprio e
  proteção do painel implementados.
- Gerenciamento de salas (`public.rooms`) integrado ao painel: Visão Geral resumida e página
  protegida com criação, listagem, ativação/pausa e RLS de proprietário.
- Migration de `public.rooms` com RLS aplicada ao projeto remoto em 2026-11-02 e verificada por
  consultas somente leitura; suíte pgTAP de 33 asserções executada no workflow.
- Código público único por sala com backfill, link compartilhável, QR Code local (cópia e
  download) e página pública do convidado com estados de carga, não encontrada, indisponível e
  erro — migration `20261103000000` aplicada e schema/RPC/permissões verificados remotamente;
  88 testes pgTAP aprovados no GitHub Actions.
- Migration de `public.dj_profiles` com RLS aplicada ao projeto remoto; schema, políticas e
  privilégios verificados por consultas somente leitura. Suíte pgTAP executada no PR #1.
- Login com Google validado com conta real (redirect, retorno no domínio de produção e sessão
  estabelecida); fluxos de e-mail/senha, sessão, logout e perfil cobertos pela suíte local com
  doubles simulados.
- Preparo do Cloudflare Pages: `public/_redirects` para as rotas internas da SPA, `.nvmrc` com
  a versão do Node exigida pelo build e documentação do endereço de produção.
- `supabase/config.toml` e workflow de pgTAP no GitHub Actions preparados para execução local
  isolada, sem projeto remoto.
- Testes essenciais, lint, typecheck e build configurados.
- Documentação de arquitetura e changelog inicial.

### Funcionalidades pendentes

- Validação manual dos fluxos autenticados em produção (login, salas, link e QR Code).
- Validação remota dos fluxos de e-mail/senha (cadastro, confirmação de e-mail, login e logout)
  com uma conta real no projeto Supabase.
- Validação do isolamento entre DJs com fluxos autenticados reais (a suíte pgTAP cobre o banco;
  a execução com duas contas reais ainda não foi feita).
- Publicação do aplicativo Google OAuth, hoje em modo de teste no Google Cloud (restrito a
  usuários de teste), para uso geral.
- Recuperação de senha e gestão de credenciais.
- Integração do Supabase Realtime aos fluxos da aplicação.
- Disponibilidade em produção da gestão de pedidos, fila, busca YouTube, player e histórico: o
  código está implementado, mas depende das migrations/RPCs cujo estado remoto não está confirmado.
- Validação real das Pages Functions, incluindo busca via chave/cota efetiva do YouTube.
- Revisão/aprovação dos Termos de Uso e Política de Privacidade, identificação do controlador,
  canal de contato e definição dos prazos de retenção.
- Pagamentos.
- Validação real de reprodução musical em produção.

### Próxima etapa prevista

Antes de publicar os fluxos do painel por sala, confirmar em modo somente leitura o estado remoto
das migrations/RPCs necessárias; aplicar migrations pendentes requer autorização específica. Depois,
validar os fluxos autenticados, o runtime das Pages Functions e a busca/player do YouTube em
produção. Também permanecem pendentes a aprovação jurídica dos documentos e o Supabase Realtime.

## Contribuição e licença

### Contribuição

- Siga as diretrizes de [`AGENTS.md`](AGENTS.md).
- Mantenha TypeScript strict, código tipado e separação entre interface, regras de negócio e
  integrações.
- Não adicione dependências sem necessidade comprovada.
- Preserve acessibilidade, responsividade mobile-first e segurança multi-tenant.
- Toda alteração relevante deve ser revisada antes de ser publicada.
- Atualize a documentação somente com comportamentos realmente implementados.

### Procedência dos assets visuais

Segundo declaração do responsável pelo projeto, todas as imagens do YouDJ foram criadas por ele
com ferramentas de IA especificamente para este projeto. Não é exigida licença CC0 ou CC BY para
esses assets originais; a procedência só deve ser investigada novamente quando houver indícios
concretos de conteúdo de terceiros ou outra restrição de uso. Esta declaração trata dos assets
visuais e não define a licença do código do repositório.

### Licença

Não existe arquivo `LICENSE` neste repositório. O licenciamento ainda não foi formalmente
definido. O fato de o repositório ser público não significa que o código seja de uso livre.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura, multi-tenant e integrações
  planejadas.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de mudanças relevantes.
- [`AGENTS.md`](AGENTS.md) — diretrizes de desenvolvimento e colaboração.
