# Arquitetura — DJ IA

## 1. Visão geral

O DJ IA será uma plataforma SaaS multi-tenant em que cada DJ gerencia suas próprias salas de
música, pedidos e histórico. Convidados acessam uma sala por link ou QR Code, sem cadastro
obrigatório.

Esta versão entrega apenas a fundação frontend e a estrutura de navegação. Nenhuma integração
externa, autenticação ou persistência foi implementada.

## 2. Tecnologias atuais

| Camada            | Tecnologia                        | Papel                                      |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Build/dev server  | Vite 8                            | Desenvolvimento e empacotamento            |
| Interface         | React 19                          | Componentes e composição da UI             |
| Linguagem         | TypeScript 5.9 (strict)           | Tipagem estática                           |
| Estilos           | Tailwind CSS 4                    | Design system utilitário e responsividade  |
| Navegação         | React Router 7                    | Rotas públicas, painel e convidados        |
| Qualidade         | ESLint 10                         | Análise estática                           |
| Testes            | Vitest 5 + Testing Library 16     | Testes essenciais de UI e regras           |

## 3. Estrutura atual

```text
src/
  app/                    # composição da aplicação (router provider)
  components/             # componentes reutilizáveis (Brand, ícones, badges)
  features/
    guest/lib/            # regras puras do domínio de convidados
  layouts/                # PublicLayout e DjLayout
  pages/
    dj/                   # login e prévia do painel
    guest/                # acesso por código da sala
    HomePage.tsx          # apresentação do produto
    NotFoundPage.tsx      # 404
  routes/                 # tabela de rotas
  styles/                 # Tailwind e tokens visuais
  test/                   # setup do Vitest
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

A modelagem detalhada e as políticas de RLS serão definidas na etapa de integração com o
Supabase, antes de qualquer dado real.

### Convidados

O acesso será por link/QR Code. Identidades anônimas do Supabase Auth poderão ser usadas para
limitar e auditar solicitações sem exigir cadastro. Regras de rate limiting e moderação serão
avaliadas junto da implementação de pedidos.

## 6. Integrações planejadas

| Integração              | Uso planejado                                                | Estado      |
| ----------------------- | ------------------------------------------------------------ | ----------- |
| Supabase Auth           | Login de DJs e identidades anônimas de convidados             | Planejado   |
| Supabase PostgreSQL     | Salas, pedidos, músicas, pagamentos e histórico               | Planejado   |
| Supabase Realtime       | Atualização da fila e dos pedidos em tempo real               | Planejado   |
| Cloudflare Pages        | Hospedagem do frontend estático                               | Planejado   |
| APIs de pagamentos      | Pedidos pagos e histórico financeiro                          | Planejado   |
| YouTube IFrame Player API | Reprodução/controle de vídeos e músicas                     | Planejado   |

Nenhuma dessas integrações está ativa nesta versão. Não há dependências, variáveis de ambiente
ou chamadas de rede relacionadas a elas.

## 7. Segurança

Princípios que devem orientar as próximas etapas:

- Segredos apenas em variáveis de ambiente locais ou no provedor; nunca no repositório.
- Autorização validada no banco e no servidor, não apenas no cliente.
- Menor privilégio para chaves e tokens.
- Validação de entrada tanto no cliente quanto no servidor.
- Isolamento explícito por `dj_id` em todas as consultas.
- Conteúdo de terceiros (músicas, vídeos, imagens) usado somente com autorização.
- Nenhuma simulação de pagamento ou autenticação apresentada como funcionalidade real.

## 8. Fora do escopo desta etapa

- Autenticação funcional.
- Banco de dados, persistência e Realtime.
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
6. Configurar CI e deploy no Cloudflare Pages quando houver autorização.
