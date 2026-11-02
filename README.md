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
> persistência do perfil `public.dj_profiles`, proteção do painel e criação/listagem de salas em
> `public.rooms` estão implementados com Supabase Auth e RLS. QR Codes, pedidos, pagamentos e
> reprodução musical ainda **não** estão implementados. A migration de perfis foi aplicada ao
> projeto remoto; a migration de salas está preparada localmente e ainda não foi aplicada. O login
> com Google foi validado com conta real e os fluxos de autenticação do frontend têm suíte local
> aprovada. O último deploy acompanhado (2026-11-02) publicou o build no Cloudflare Pages, mas
> sem `VITE_SUPABASE_URL` no bundle; a correção da variável e a revalidação da autenticação em
> produção seguem pendentes.

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
- Criação e listagem das salas do DJ em `public.rooms`, com RLS de proprietário, estados de
  carregamento/vazio/erro no painel e contagem de salas ativas.
- Painel administrativo com indicadores e roadmap; a identidade/perfil e as salas são reais,
  enquanto pedidos e pagamentos continuam indisponíveis.
- Página preparatória de acesso por código de sala, com normalização para maiúsculas e
  validação local do formato de 6 caracteres alfanuméricos.
- Tela de link inválido para códigos de sala malformados.
- Página 404 para rotas desconhecidas.
- ESLint, Vitest, Testing Library e jsdom configurados.
- Cliente Supabase centralizado, com validação das variáveis públicas e criação sob demanda.
- Testes essenciais para a página inicial, a rota de convidados, as regras de código de sala,
  a configuração do cliente Supabase e os fluxos de autenticação/perfil com doubles simulados.
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

Arquivos preparados nesta etapa (**ainda não aplicados ao remoto**):

- Migration `supabase/migrations/20261102000000_create_rooms.sql`, que cria `public.rooms`
  vinculada a `public.dj_profiles` (com cascade), com nome de 2 a 60 caracteres, status
  (`active`/`paused`), timestamps, índice de listagem por proprietário, RLS e privilégios mínimos
  por coluna.
- Suíte pgTAP `supabase/tests/rooms_rls.test.sql` com 33 asserções de privilégios, isolamento
  entre DJs, bloqueio de convidados anônimos e de usuários não autenticados, constraints,
  integridade referencial e cascade.

A migration foi aplicada ao projeto remoto em 2026-11-02 com `supabase db push --linked
--skip-vault`; o histórico remoto registra a versão `20261031000000`. A suíte pgTAP é executada
em um Supabase local no workflow do GitHub Actions, sem projeto remoto. A validação remota desta
etapa limitou-se a consultas somente leitura de schema, políticas e privilégios.

### Rotas atuais

| Rota              | Estado       | Comportamento atual                                                    |
| ----------------- | ------------ | ---------------------------------------------------------------------- |
| `/`               | Implementada | Página inicial e apresentação do produto.                              |
| `/dj`             | Implementada | Login de DJ via Supabase Auth (e-mail ou Google).                       |
| `/dj/cadastro`    | Implementada | Cadastro de DJ; pode exigir confirmação de e-mail ou usar Google.          |
| `/dj/painel`      | Protegida    | Exige sessão de DJ e perfil carregado; cria e lista salas. |
| `/sala/:roomCode` | Prévia       | Valida o formato local do código e informa que a sala virá depois.      |
| `*`               | Implementada | Página 404.                                                             |

### O que ainda não está implementado

- Recuperação de senha e gestão de e-mail/senha.
- QR Codes e links de convidados para as salas; a listagem e a criação de salas já existem.
- Persistência de pedidos, filas e histórico. O perfil e as salas são persistidos em runtime.
- Aplicação da migration de `public.rooms` ao projeto remoto (preparada localmente).
- Vínculo manual de identidades (Google e e-mail/senha) quando o Supabase não faz o
  vínculo automático por e-mail verificado.
- Pedidos, aprovação, fila, histórico e atualizações em tempo real.
- Identidades anônimas de convidados.
- Pagamentos e histórico financeiro.
- Reprodução musical e integração com a YouTube IFrame Player API.
- Publicação no Cloudflare Pages: primeiro deploy acompanhado em 2026-11-02 com build publicado,
  porém sem `VITE_SUPABASE_URL` no bundle; correção da variável e revalidação em produção
  pendentes.

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
- RLS aplicada ao perfil; políticas para as futuras tabelas ainda serão definidas e testadas.
- Isolamento do perfil entre DJs; isolamento de salas/pedidos depende das tabelas futuras.

### Fase 3 — Salas e convidados · Em andamento

- Criação e listagem de salas com isolamento por DJ (implementado; migration local pendente de
  aplicação remota).
- Links exclusivos.
- QR Codes.
- Acesso sem cadastro obrigatório.
- Identidades anônimas controladas.
- Proteção contra spam.

### Fase 4 — Pedidos musicais · Planejada

- Solicitações de músicas.
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
| @supabase/supabase-js     | 2.118.0 | Autenticação e acesso tipado ao perfil do DJ      |
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
| Supabase PostgreSQL        | Salas (`public.rooms`)                             | Implementado; migration local pendente de aplicação remota |
| Supabase PostgreSQL        | Pedidos, músicas, histórico e pagamentos           | Planejado |
| Supabase Realtime          | Atualização da fila e dos pedidos em tempo real    | Planejado |
| Cloudflare Pages           | Hospedagem do frontend estático                    | Deploy publicado em 2026-11-02; variável pública faltando no bundle |
| YouTube IFrame Player API  | Reprodução e controle de vídeos, quando permitido  | Planejado |
| Provedor de pagamentos Pix | Pedidos pagos, confirmação e histórico financeiro  | Planejado |

O SDK `@supabase/supabase-js` está instalado e o cliente é criado sob demanda em
`src/integrations/supabase/client.ts`, com tipos da tabela `dj_profiles` e validação das variáveis
públicas. Autenticação e leitura/criação do perfil de DJ são usadas em runtime. Salas, pedidos e
demais dados de domínio ainda não são persistidos.

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
│   │   └── 20261102000000_create_rooms.sql
│   └── tests/
│       ├── dj_profiles_rls.test.sql
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
validação e criação/listagem de salas (store, hook e painel). A suíte Vitest tem 76 testes em 22
arquivos.

A suíte pgTAP tem 61 asserções: 28 em `supabase/tests/dj_profiles_rls.test.sql` e 33 em
`supabase/tests/rooms_rls.test.sql`. Ela é executada em um Supabase local isolado pelo workflow
do GitHub Actions, pois o ambiente local não possui Docker nem PostgreSQL.

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

O workflow não usa `--linked`, `service_role`, credenciais de produção ou o projeto remoto. Ele
foi executado no PR #1; os 28 testes foram aprovados conforme o resultado do PR e não foram
reexecutados nesta etapa.

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
- A validação do código de sala é apenas de formato e ocorre no cliente.
- Segredos não devem ser expostos no frontend nem versionados.
- A migration de `public.dj_profiles` define RLS, permissões mínimas, isolamento por
  `auth.uid()` e bloqueio de convidados anônimos. Ela foi aplicada ao banco remoto; políticas e
  privilégios foram verificados por consultas somente leitura.
- A migration de `public.rooms` aplica o mesmo padrão: RLS de proprietário (`dj_id = auth.uid()`
  e `is_anonymous` falso), privilégios por coluna, sem `DELETE` pela API e cascade por
  `dj_profiles`. Está preparada localmente, com 33 asserções pgTAP, e **não** foi aplicada ao
  remoto.

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
- **Estado atual:** variáveis públicas do Supabase configuradas no Cloudflare Pages. O deploy do
  commit `a12f170` foi acompanhado com sucesso em 2026-11-02, mas o bundle publicado ficou sem
  `VITE_SUPABASE_URL`; a autenticação em produção segue indisponível até a correção da variável
  e um novo deploy. Estado não revalidado desde então.
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
- Rotas públicas, cadastro/login de DJs, painel protegido e prévia do acesso de convidados.
- Validação local do formato do código de sala.
- Cliente Supabase centralizado e tipado; cadastro/login/logout de DJs, sessão, perfil próprio e
  proteção do painel implementados.
- Criação e listagem de salas (`public.rooms`) integradas ao painel, com RLS de proprietário,
  validação de nome e estados de carregamento, vazio e erro.
- Migration de `public.rooms` e suíte pgTAP de 33 asserções preparadas localmente, aguardando
  autorização para aplicação remota e execução no workflow.
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

- Aplicar a migration `20261102000000_create_rooms.sql` ao projeto remoto e executar a suíte
  pgTAP de `rooms` no workflow (ambas exigem autorização).
- Validação remota dos fluxos de e-mail/senha (cadastro, confirmação de e-mail, login e logout)
  com uma conta real no projeto Supabase.
- Validação do isolamento entre DJs com fluxos autenticados reais (a suíte pgTAP cobre o banco;
  a execução com duas contas reais ainda não foi feita).
- Publicação do aplicativo Google OAuth, hoje em modo de teste no Google Cloud (restrito a
  usuários de teste), para uso geral.
- Recuperação de senha e gestão de credenciais.
- Integração do Supabase Realtime aos fluxos da aplicação.
- Links e QR Codes reais para as salas.
- Pedidos, aprovação, fila e histórico.
- Identidades anônimas de convidados.
- Pagamentos.
- Reprodução musical.
- Correção de `VITE_SUPABASE_URL` no Cloudflare Pages, novo deploy e revalidação da
  autenticação em produção.

### Próxima etapa prevista

Corrigir `VITE_SUPABASE_URL` no Cloudflare Pages e revalidar a autenticação em produção;
aplicar a migration de `public.rooms` ao projeto remoto (com autorização) e executar a suíte
pgTAP de salas no workflow; depois, implementar links e QR Codes de convidados.

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
