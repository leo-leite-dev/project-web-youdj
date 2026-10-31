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

> **Aviso de escopo:** este repositório está em desenvolvimento e representa a fundação
> inicial do produto (`v0.1.0`). Autenticação, banco de dados, salas reais, pedidos,
> pagamentos, reprodução musical e deploy ainda **não** estão implementados. As interfaces
> demonstrativas não executam operações reais.

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
- Página de login do DJ **somente visual**: o formulário não valida credenciais nem cria
  sessões.
- Estrutura visual do painel administrativo com indicadores, estados vazios e roadmap, sem
  dados reais ou proteção de rota.
- Página preparatória de acesso por código de sala, com normalização para maiúsculas e
  validação local do formato de 6 caracteres alfanuméricos.
- Tela de link inválido para códigos de sala malformados.
- Página 404 para rotas desconhecidas.
- ESLint, Vitest, Testing Library e jsdom configurados.
- Testes essenciais para a página inicial, a rota de convidados e as regras de código de sala.
- Scripts de typecheck, lint, teste, build e preview.

### Rotas atuais

| Rota              | Estado       | Comportamento atual                                                    |
| ----------------- | ------------ | ---------------------------------------------------------------------- |
| `/`               | Implementada | Página inicial e apresentação do produto.                              |
| `/dj`             | Implementada | Login do DJ somente visual, sem autenticação.                           |
| `/dj/painel`      | Prévia       | Estrutura do painel administrativo, sem dados reais ou proteção.        |
| `/sala/:roomCode` | Prévia       | Valida o formato local do código e informa que a sala virá depois.      |
| `*`               | Implementada | Página 404.                                                             |

### O que ainda não está implementado

- Autenticação real e sessões de DJ.
- Banco de dados e persistência.
- Criação de salas, links e QR Codes reais.
- Pedidos, aprovação, fila, histórico e atualizações em tempo real.
- Identidades anônimas de convidados.
- Pagamentos e histórico financeiro.
- Reprodução musical e integração com a YouTube IFrame Player API.
- Deploy e endereço de produção.

## Roadmap de desenvolvimento

### Fase 1 — Fundação · Concluída

- Inicialização do projeto.
- Frontend React e TypeScript.
- Roteamento.
- Interfaces iniciais.
- Documentação e testes.

### Fase 2 — Banco de dados e autenticação · Planejada

- Supabase PostgreSQL.
- Login exclusivo dos DJs.
- Integração futura com autenticação unificada, se aprovada.
- Arquitetura SaaS multi-tenant.
- Row Level Security (RLS).
- Isolamento dos dados entre DJs.

### Fase 3 — Salas e convidados · Planejada

- Criação de salas.
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

- Node.js `^20.19.0` ou `>=22.12.0`.
- npm 10 ou superior.

### Serviços planejados

| Serviço                    | Uso planejado                                      | Estado    |
| -------------------------- | -------------------------------------------------- | --------- |
| Supabase Auth              | Login de DJs e identidades anônimas de convidados  | Planejado |
| Supabase PostgreSQL        | Salas, pedidos, músicas, histórico e pagamentos    | Planejado |
| Supabase Realtime          | Atualização da fila e dos pedidos em tempo real    | Planejado |
| Cloudflare Pages           | Hospedagem do frontend estático                    | Planejado |
| YouTube IFrame Player API  | Reprodução e controle de vídeos, quando permitido  | Planejado |
| Provedor de pagamentos Pix | Pedidos pagos, confirmação e histórico financeiro  | Planejado |

Nenhum desses serviços está configurado ou ativo nesta versão.

## Arquitetura

- Aplicação SPA em React e TypeScript, empacotada pelo Vite.
- Interface separada entre área pública, área do DJ e área de convidados.
- Componentes reutilizáveis em `src/components` e layouts em `src/layouts`.
- Regras testáveis isoladas em `src/features/*/lib`.
- Roteamento centralizado em `src/routes`.
- Arquitetura multi-tenant planejada, com isolamento por `dj_id` e Row Level Security no
  PostgreSQL.
- Autenticação e autorização previstas para o backend/banco, nunca apenas no cliente.
- Atualização da fila em tempo real planejada com Supabase Realtime.

A descrição completa, incluindo o conceito multi-tenant e as integrações previstas, está em
[`docs/architecture.md`](docs/architecture.md).

## Estrutura do projeto

```text
.
├── .opencode/
│   └── agents/
│       └── normandy.md
├── docs/
│   └── architecture.md
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   └── App.tsx
│   ├── components/
│   │   ├── Brand.tsx
│   │   ├── Icons.tsx
│   │   └── PlannedBadge.tsx
│   ├── features/
│   │   └── guest/
│   │       └── lib/
│   │           ├── roomCode.test.ts
│   │           └── roomCode.ts
│   ├── layouts/
│   │   ├── DjLayout.tsx
│   │   └── PublicLayout.tsx
│   ├── pages/
│   │   ├── dj/
│   │   │   ├── DjDashboardPage.tsx
│   │   │   └── DjLoginPage.tsx
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
│   │   └── setup.ts
│   └── main.tsx
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

O resultado é gerado em `dist/`.

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

Os testes atuais cobrem a apresentação da página inicial, os estados da rota de convidados e
as regras de normalização e validação do código de sala.

| Verificação         | Finalidade                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `npm run typecheck` | Garante que o código respeita o TypeScript em modo strict.        |
| `npm run lint`      | Detecta problemas de padrão, consistência e possíveis erros.      |
| `npm run test`      | Executa a suíte Vitest com Testing Library e jsdom.               |
| `npm run build`     | Valida os tipos e gera os arquivos estáticos de produção.         |

Não há pipeline de integração contínua configurado no GitHub Actions nesta versão.

## Segurança

### Proteções existentes

- `.gitignore` cobre dependências, builds, cobertura, logs, variáveis de ambiente e arquivos
  temporários.
- Nenhuma credencial real é necessária para executar o projeto nesta fase.
- Nenhuma autenticação fictícia, transação simulada ou dado de pagamento é processado.
- A validação do código de sala é apenas de formato e ocorre no cliente.
- Segredos não devem ser expostos no frontend nem versionados.

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
- **Estado atual:** não publicado. Não existe endereço de produção configurado.
- **Cloudflare Pages:** opção planejada para hospedagem do frontend estático, ainda não
  configurada.

## Estado atual

### Entregas concluídas

- Fundação React, Vite e TypeScript strict.
- Tailwind CSS e layout responsivo.
- Rotas públicas, área visual do DJ, prévia do painel e acesso de convidados.
- Validação local do formato do código de sala.
- Testes essenciais, lint, typecheck e build configurados.
- Documentação de arquitetura e changelog inicial.

### Funcionalidades pendentes

- Supabase Auth, PostgreSQL e Realtime.
- Salas, links e QR Codes reais.
- Pedidos, aprovação, fila e histórico.
- Identidades anônimas de convidados.
- Pagamentos.
- Reprodução musical.
- Deploy e publicação.

### Próxima etapa prevista

Fase 2: definir o modelo de dados multi-tenant, implementar autenticação de DJs e aplicar
Row Level Security antes de qualquer dado real.

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
