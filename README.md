# DJ IA

Plataforma SaaS de pedidos musicais para DJs, festas e estabelecimentos. O DJ cria uma sala,
compartilha um link ou QR Code e os convidados pedem músicas sem cadastro obrigatório.

> **Status:** fundação inicial (`v0.1.0`). A interface e a arquitetura base estão prontas.
> Autenticação, banco de dados, pedidos reais, pagamentos e player ainda **não** foram
> implementados.

## Visão geral

O projeto foi estruturado para evoluir como uma plataforma multi-tenant, na qual cada DJ terá
sua própria conta, painel, salas e histórico. Nesta etapa existem apenas:

- Página inicial de apresentação do produto.
- Área do DJ com tela de login **somente visual**.
- Prévia da estrutura do painel administrativo.
- Rota de convidados por código de sala, com validação de formato e tratamento de link
  inválido.
- Documentação, testes essenciais e ferramentas de qualidade.

Nenhuma credencial é validada, nenhum pedido é criado e nenhum dado é persistido.

## Stack

| Tecnologia      | Versão |
| --------------- | ------ |
| React           | 19.3   |
| Vite            | 8.3    |
| TypeScript      | 5.9    |
| Tailwind CSS    | 4.3    |
| React Router    | 7.18   |
| ESLint          | 10.14  |
| Vitest          | 5.0    |
| Testing Library | 16.3   |
| Node.js         | 22.12+ (recomendado) |

Consulte `package.json` para as versões exatas.

## Requisitos

- Node.js `^20.19.0` ou `>=22.12.0` (exigência do Vite 8).
- npm 10+.

## Instalação e execução

```bash
npm install
npm run dev
```

O servidor de desenvolvimento exibe a URL local no terminal, normalmente
`http://localhost:5173`.

> No Windows com PowerShell e política de execução restritiva, use `npm.cmd` no lugar de `npm`.

## Scripts

| Comando             | Descrição                                    |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Inicia o servidor de desenvolvimento.        |
| `npm run typecheck` | Executa a verificação de tipos.              |
| `npm run lint`      | Executa o ESLint.                            |
| `npm run test`      | Executa os testes automatizados uma vez.     |
| `npm run test:watch`| Executa os testes em modo observação.        |
| `npm run build`     | Verifica os tipos e gera o build de produção.|
| `npm run preview`   | Serve localmente o build de produção.        |

## Rotas

| Rota              | Estado      | Descrição                                                  |
| ----------------- | ----------- | ---------------------------------------------------------- |
| `/`               | Implementada| Página inicial e apresentação do produto.                   |
| `/dj`             | Implementada| Login do DJ somente visual, sem autenticação.               |
| `/dj/painel`      | Prévia      | Estrutura do painel administrativo, sem dados reais.        |
| `/sala/:roomCode` | Prévia      | Valida o formato do código e informa que a sala virá depois.|
| `*`               | Implementada| Página 404.                                                 |

Códigos de sala válidos têm exatamente 6 letras ou números. O código é normalizado para
maiúsculas antes da validação. A validação real da existência da sala dependerá do banco de
dados no futuro.

## Estrutura

```text
src/
  app/          # composição da aplicação
  components/   # componentes visuais reutilizáveis
  features/     # regras de negócio por domínio
  layouts/      # layouts público e do painel
  pages/        # páginas por área (home, dj, guest)
  routes/       # definição das rotas
  styles/       # Tailwind e tokens visuais
  test/         # configuração de testes
docs/
  architecture.md
```

## Configuração de ambiente

Nenhuma variável de ambiente é necessária nesta etapa. Integrações futuras (Supabase,
pagamentos e YouTube) deverão usar arquivos `.env` locais, que são ignorados pelo Git. Nunca
versione segredos.

## Segurança e multi-tenant

- O isolamento por DJ será garantido no banco de dados com `dj_id` em cada tabela de domínio e
  políticas de Row Level Security (RLS).
- O cliente nunca deve ser a única barreira de autorização.
- Convidados acessarão por link/QR Code e identidades anônimas, sem cadastro obrigatório.
- Segredos e chaves de serviço nunca serão expostos no frontend.

Detalhes em [`docs/architecture.md`](docs/architecture.md).

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura, integrações planejadas e
  conceito multi-tenant.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico do que foi efetivamente implementado.
- [`AGENTS.md`](AGENTS.md) — diretrizes do agente Normandy.
