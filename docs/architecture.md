# Arquitetura — YouDJ

## 1. Visão geral

O YouDJ será uma plataforma SaaS multi-tenant em que cada DJ gerencia suas próprias salas de
música, pedidos e histórico. Convidados acessam uma sala por link ou QR Code, sem cadastro
obrigatório.

Esta versão entrega a fundação frontend, a estrutura de navegação e a configuração inicial do
cliente Supabase. Autenticação, persistência e operações de dados ainda não foram
implementadas. Existe uma migration local para a primeira tabela (`public.dj_profiles`) com
RLS e testes pgTAP, mas ela ainda não foi aplicada ao Supabase remoto.

## 2. Tecnologias atuais

| Camada            | Tecnologia                        | Papel                                      |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Build/dev server  | Vite 8                            | Desenvolvimento e empacotamento            |
| Interface         | React 19                          | Componentes e composição da UI             |
| Linguagem         | TypeScript 5.9 (strict)           | Tipagem estática                           |
| Estilos           | Tailwind CSS 4                    | Design system utilitário e responsividade  |
| Navegação         | React Router 7                    | Rotas públicas, painel e convidados        |
| Integração        | @supabase/supabase-js 2.118.0     | Cliente para futuras operações no Supabase |
| Qualidade         | ESLint 10                         | Análise estática                           |
| Testes            | Vitest 5 + Testing Library 16     | Testes essenciais de UI e regras           |

## 3. Estrutura atual

```text
src/
  app/                    # composição da aplicação (router provider)
  components/             # componentes reutilizáveis (Brand, ícones, badges)
  features/
    guest/lib/            # regras puras do domínio de convidados
  integrations/
    supabase/             # cliente centralizado e testes de configuração
  layouts/                # PublicLayout e DjLayout
  pages/
    dj/                   # login e prévia do painel
    guest/                # acesso por código da sala
    HomePage.tsx          # apresentação do produto
    NotFoundPage.tsx      # 404
  routes/                 # tabela de rotas
  styles/                 # Tailwind e tokens visuais
  test/                   # setup do Vitest
  vite-env.d.ts           # tipagem das variáveis de ambiente do Vite
supabase/
  config.toml             # configuração do stack local e dos testes
  migrations/             # migrations SQL versionadas, ainda não aplicadas
  tests/                  # testes pgTAP de RLS e integridade
.github/
  workflows/
    supabase-tests.yml    # execução local dos testes pgTAP em Pull Requests
```

A separação busca manter regras de negócio fora dos componentes de interface. Regras puras
testáveis ficam em `features/*/lib`.

## 4. Rotas e estados

| Rota              | Natureza   | Comportamento atual                                      |
| ----------------- | ---------- | -------------------------------------------------------- |
| `/`               | Implementada | Apresentação, proposta de valor e CTAs.                |
| `/dj`             | Implementada | Formulário visual desabilitado; não autentica.          |
| `/dj/painel`      | Prévia      | Shell do painel sem proteção, dados ou persistência.    |
| `/sala/:roomCode` | Prévia      | Valida formato local; não consulta banco de dados.      |
| `*`               | Implementada | Página 404.                                            |

A validação do código de sala em `features/guest/lib/roomCode.ts` normaliza o valor e exige
exatamente 6 caracteres alfanuméricos (`A-Z`, `0-9`). Isso é apenas validação de formato, não
de existência.

## 5. Conceito multi-tenant

O modelo planejado é de **schema compartilhado com isolamento por linha**:

- Cada DJ terá uma conta e um identificador (`dj_id`).
- Tabelas de domínio (salas, pedidos, músicas, pagamentos) terão `dj_id` obrigatório.
- Row Level Security (RLS) no PostgreSQL permitirá leitura e escrita apenas quando o usuário
  autenticado corresponder ao dono do recurso.
- Chaves com privilégio de serviço nunca serão usadas no cliente.
- A camada de interface nunca será considerada a única barreira de autorização.

A primeira tabela preparada é `public.dj_profiles`, ainda não aplicada ao banco remoto:

- `id uuid` é chave primária e referencia `auth.users(id)` com `on delete cascade`.
- `display_name text` é obrigatório, tem de 2 a 80 caracteres e não aceita espaços em branco
  nas extremidades.
- `created_at` e `updated_at` são gerados pelo banco; `updated_at` é mantido por trigger.
- RLS está habilitada. `authenticated` recebe apenas `SELECT`, `INSERT` e `UPDATE` nas colunas
  necessárias; `anon` não recebe privilégios e `DELETE` não é concedido.
- As políticas exigem `auth.uid() = id` e o claim `is_anonymous` explicitamente `false`,
  impedindo que convidados anônimos criem ou alterem perfis de DJ.
- A suíte pgTAP cobre permissões, isolamento entre usuários, convidados anônimos, constraints,
  integridade referencial e cascade. Ela ainda não foi executada. O workflow
  `.github/workflows/supabase-tests.yml` está preparado para executá-la em um Supabase local
  isolado no GitHub Actions, sem conexão com o projeto remoto.

As demais tabelas de domínio deverão usar `dj_id` obrigatório e políticas RLS equivalentes,
sempre validadas no banco antes de qualquer dado real.

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

Nenhuma autenticação, consulta ou operação de dados está ativa em runtime. Existe uma migration
local para `public.dj_profiles`, ainda não aplicada, e testes pgTAP correspondentes ainda não
executados. A conectividade com o Supabase Auth foi validada manualmente por requisições somente
leitura aos endpoints oficiais, sem sessão autenticada e sem alterar dados.

### Serviços planejados

| Integração              | Uso planejado                                                | Estado      |
| ----------------------- | ------------------------------------------------------------ | ----------- |
| Supabase Auth           | Login de DJs e identidades anônimas de convidados             | Planejado   |
| Supabase PostgreSQL     | Salas, pedidos, músicas, pagamentos e histórico               | Em preparação |
| Supabase Realtime       | Atualização da fila e dos pedidos em tempo real               | Planejado   |
| Cloudflare Pages        | Hospedagem do frontend estático                               | Planejado   |
| APIs de pagamentos      | Pedidos pagos e histórico financeiro                          | Planejado   |
| YouTube IFrame Player API | Reprodução/controle de vídeos e músicas                     | Planejado   |

Nenhum desses serviços está integrado à aplicação em runtime nesta versão. O SDK do Supabase
está instalado, mas não há autenticação, chamadas de dados ou operações de rede na aplicação. A
migration de `public.dj_profiles` existe no repositório, mas não foi aplicada ao projeto remoto.

## 7. Segurança

Princípios que devem orientar as próximas etapas:

- Segredos apenas em variáveis de ambiente locais ou no provedor; nunca no repositório.
- Apenas a publishable key pode ser exposta no frontend. `service_role`, secret keys e a senha
  do banco nunca devem ser usadas no cliente.
- Autorização validada no banco e no servidor, não apenas no cliente.
- Menor privilégio para chaves e tokens.
- Validação de entrada tanto no cliente quanto no servidor.
- Isolamento explícito por `dj_id` em todas as consultas.
- Conteúdo de terceiros (músicas, vídeos, imagens) usado somente com autorização.
- Nenhuma simulação de pagamento ou autenticação apresentada como funcionalidade real.

## 8. Fora do escopo desta etapa

- Autenticação funcional.
- Banco de dados em execução, persistência em runtime e Realtime.
- Criação de salas, QR Codes reais e pedidos.
- Pagamentos.
- Player de música/vídeo.
- Deploy no Cloudflare Pages.
- Testes end-to-end em navegador.

## 9. Próximos passos recomendados

1. Definir o modelo de dados multi-tenant e as políticas de RLS.
2. Integrar Supabase Auth e proteger as rotas do painel.
3. Implementar criação de salas, QR Code e links de convidados.
4. Implementar pedidos com Supabase Realtime.
5. Adicionar player e, depois, pagamentos.
6. Validar o workflow de pgTAP em um Pull Request real e configurar CI de aplicação e deploy no
   Cloudflare Pages quando houver autorização.
