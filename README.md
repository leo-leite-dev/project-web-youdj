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
> implementados no código com Supabase Auth e RLS. As migrations de perfis e salas foram
> aplicadas ao projeto remoto; a migration dos códigos públicos (`20261103000000`) está
> preparada localmente, ainda sem aplicação remota nem deploy — o compartilhamento 3B aguarda
> essas etapas. Pesquisa musical e envio inicial de pedidos estão implementados localmente na
> Etapa 4A, mas aguardam configuração das secrets/Functions no Cloudflare e aplicação da migration
> de pedidos. Aprovação, fila, pagamentos e reprodução ainda **não** estão implementados.
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
  protegida `/dj/painel/salas`, com RLS de proprietário e estados de carregamento/vazio/erro; a
  Visão Geral mantém contagem e resumo das salas.
- Código público único de 10 caracteres por sala (~52 bits de entropia, gerado no banco e
  imutável pela API), com backfill das salas existentes, link compartilhável `/sala/:codigo` e QR Code gerado
  localmente (sem serviços externos), com cópia do link e download de PNG no painel.
- Página pública do convidado que consulta a sala por código (somente nome e estado), com
  estados de carregamento, não encontrada, indisponível e erro com nova tentativa.
- Busca opcional de vídeos sob ação do convidado e envio de pedidos por busca ou formulário
  manual, mediados por Cloudflare Pages Functions; pedidos pendentes criados por RPC restrita ao
  backend, sem acesso público direto à tabela.
- Painel administrativo com Visão Geral resumida e página dedicada para gerenciar salas; a
  identidade/perfil e as salas são reais; o painel ainda não oferece gestão de pedidos ou pagamentos.
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
| `/dj/painel`      | Protegida    | Exige sessão de DJ e perfil carregado; mostra o resumo das salas. |
| `/dj/painel/salas` | Protegida   | Cria, lista, ativa/pausa e compartilha salas via link e QR Code. |
| `/sala/:roomCode` | Implementada | Consulta pública, pesquisa sob demanda e envio inicial de pedidos (requer backend configurado). |
| `*`               | Implementada | Página 404.                                                             |

### O que ainda não está implementado

- Recuperação de senha e gestão de e-mail/senha.
- Gestão/consulta de pedidos, filas, aprovação e histórico no painel. A gravação inicial depende
  da migration local e das Pages Functions configuradas.
- Vínculo manual de identidades (Google e e-mail/senha) quando o Supabase não faz o
  vínculo automático por e-mail verificado.
- Aprovação, rejeição, fila, histórico e atualizações em tempo real.
- Identidades anônimas de convidados; convidados continuam sem conta, usando limits server-side.
- Pagamentos e histórico financeiro.
- Reprodução musical e integração com a YouTube IFrame Player API.
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
- Acesso público do convidado ao nome e ao estado da sala, sem cadastro (implementado).
- Identidades anônimas controladas (planejado; necessário para os pedidos).
- Proteção contra spam.

### Fase 4 — Pedidos musicais · Em andamento (Etapa 4A local)

- Pesquisa de vídeos no YouTube e pedido manual pelo convidado (implementados localmente; Pages
  Functions e migration ainda não configuradas/aplicadas remotamente).
- Persistência inicial de pedidos pendentes vinculados à sala, com validação e rate limits no
  servidor (migration preparada localmente; sem validação real no banco).
- Aprovação e rejeição.
- Fila livre.
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
| Supabase PostgreSQL        | Pedidos pendentes (Etapa 4A)                        | Implementação local; migration pendente de aplicação |
| Supabase PostgreSQL        | Histórico e pagamentos                              | Planejado |
| Supabase Realtime          | Atualização da fila e dos pedidos em tempo real    | Planejado |
| Cloudflare Pages           | Hospedagem do frontend estático                    | Deploy publicado; variáveis públicas verificadas no bundle |
| YouTube IFrame Player API  | Reprodução e controle de vídeos, quando permitido  | Planejado |
| Provedor de pagamentos Pix | Pedidos pagos, confirmação e histórico financeiro  | Planejado |

O SDK `@supabase/supabase-js` está instalado e o cliente é criado sob demanda em
`src/integrations/supabase/client.ts`, com tipos de `dj_profiles` e `rooms` e validação das
variáveis públicas. Autenticação, perfil e criação/listagem de salas são usados em runtime. A
consulta pública usa a RPC `room_by_code`; a Etapa 4A adiciona migration e Pages Functions locais,
mas pedidos ainda não serão persistidos até a migration ser aplicada e o backend configurado.

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
  `VITE_` para essas chaves. A service-role key é privilegiada e deve existir somente no servidor.
- A migration `20261105000000_add_guest_requests_and_youtube_quota.sql` está preparada localmente,
  ainda não aplicada remotamente. O deploy/configuração do Pages também não foi realizado.
- Sem `YOUTUBE_API_KEY`, a interface sinaliza a configuração pendente e permite pedido manual.
  Limites no banco: no máximo 10 novas chamadas `search.list` por dia do Pacífico, 10 buscas/IP/hora,
  cache por 6h e até 5 pedidos/IP/10 min. A documentação do YouTube informa padrão de 100 chamadas
  `search.list`/dia, 1 unidade por chamada e reset à meia-noite do Pacífico; o limite global é
  configurável de 0 a 10 em `youtube_search_budget_config` (zero bloqueia consultas sem cache),
  apenas para reduzir esse teto. Confirme
  a cota efetiva do projeto no Google Cloud e ajuste abaixo dela. Tentativas sem cache reservam cota
  mesmo se a API falhar. Cache hits não gastam cota de busca. Todas as deployments que compartilham
  a mesma chave do YouTube devem compartilhar este banco/orçamento; bancos isolados têm contadores
  separados e não formam, juntos, um limite global do projeto Google.
- O banco guarda hash SHA-256 do IP para rate limit e elimina eventos após 24h; a busca só ocorre
  após ação explícita.
- Referências: [custos e cotas da API](https://developers.google.com/youtube/v3/determine_quota_cost)
  e [políticas para desenvolvedores](https://developers.google.com/youtube/terms/developer-policies).
  Antes da busca estar disponível ao público, o produto também precisa cumprir os requisitos de
  Termos de Serviço e Política de Privacidade do cliente YouTube.

O cadastro/login de DJs e a leitura/criação do próprio perfil estão ativos. No projeto remoto
atual, a confirmação de e-mail está habilitada e o `site_url` é `https://project-web-youdj.pages.dev`;
para testar localmente o retorno do e-mail e o login com Google, execute
`npm run dev -- --port 3000` (a porta 3000 é a autorizada no painel do Supabase). Depois de
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

O Vite informa a URL local no terminal, normalmente `http://localhost:5173`.

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
| `npm run dev`        | Inicia o servidor de desenvolvimento do Vite.      |
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

A suíte pgTAP tem 88 asserções: 28 em `supabase/tests/dj_profiles_rls.test.sql`, 33 em
`supabase/tests/rooms_rls.test.sql` e 27 em `supabase/tests/rooms_public_code.test.sql`. Ela é
executada em um Supabase local isolado pelo workflow do GitHub Actions, pois o ambiente local não
possui Docker nem PostgreSQL.

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

O workflow não usa `--linked`, `service_role`, credenciais de produção ou o projeto remoto. Os 88
testes pgTAP (28 de perfis + 33 de RLS de salas + 27 de códigos públicos) passaram no GitHub
Actions.

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

- Aplicar a migration `20261103000000_add_rooms_public_code.sql` ao projeto remoto e executar a
  suíte pgTAP de códigos públicos no workflow (ambas exigem autorização).
- Validação manual dos fluxos autenticados em produção (login, salas, link e QR Code).
- Validação remota dos fluxos de e-mail/senha (cadastro, confirmação de e-mail, login e logout)
  com uma conta real no projeto Supabase.
- Validação do isolamento entre DJs com fluxos autenticados reais (a suíte pgTAP cobre o banco;
  a execução com duas contas reais ainda não foi feita).
- Publicação do aplicativo Google OAuth, hoje em modo de teste no Google Cloud (restrito a
  usuários de teste), para uso geral.
- Recuperação de senha e gestão de credenciais.
- Integração do Supabase Realtime aos fluxos da aplicação.
- Pedidos, aprovação, fila e histórico.
- Identidades anônimas de convidados.
- Pagamentos.
- Reprodução musical.

### Próxima etapa prevista

Aplicar a migration `20261103000000` ao projeto remoto (com autorização) e executar a suíte
pgTAP no workflow; concluir a validação manual em produção (login, salas, link e QR Code);
depois, avançar para pedidos musicais com identidades anônimas.

## Contribuição e licença

### Contribuição

- Siga as diretrizes de [`AGENTS.md`](AGENTS.md).
- Mantenha TypeScript strict, código tipado e separação entre interface, regras de negócio e
  integrações.
- Não adicione dependências sem necessidade comprovada.
- Preserve acessibilidade, responsividade mobile-first e segurança multi-tenant.
- Toda alteração relevante deve ser revisada antes de ser publicada.
- Atualize a documentação somente com comportamentos realmente implementados.

### Licença

Não existe arquivo `LICENSE` neste repositório. O licenciamento ainda não foi formalmente
definido. O fato de o repositório ser público não significa que o código seja de uso livre.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura, multi-tenant e integrações
  planejadas.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de mudanças relevantes.
- [`AGENTS.md`](AGENTS.md) — diretrizes de desenvolvimento e colaboração.
