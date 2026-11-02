# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
versionamento semântico.

## [Unreleased]

### Adicionado

- Dependência `@supabase/supabase-js` para preparar a integração do frontend com o Supabase.
- Cliente Supabase centralizado em `src/integrations/supabase/client.ts`, criado sob demanda
  com validação de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Tipagem das variáveis de ambiente do Vite em `src/vite-env.d.ts`.
- Arquivo `.env.example` com valores fictícios e orientação para configuração local.
- Testes unitários para validação da configuração do cliente Supabase.
- Documentação das variáveis de ambiente e do estado da integração no README e na arquitetura.
- Migration `supabase/migrations/20261031000000_create_dj_profiles.sql` para a tabela
  `public.dj_profiles`, vinculada a `auth.users`, com validação de `display_name`, timestamps,
  trigger de atualização, RLS e permissões mínimas.
- Suíte pgTAP `supabase/tests/dj_profiles_rls.test.sql` com 28 asserções para permissões,
  isolamento entre DJs, bloqueio de convidados anônimos, constraints, integridade referencial e
  cascade.
- Documentação da migration preparada, das políticas de RLS e da distinção entre execução
  local e aplicação remota.
- `supabase/config.toml` com a configuração do stack local usada por `supabase start`,
  `supabase db reset` e `supabase test db`.
- Workflow `.github/workflows/supabase-tests.yml` para executar a migration e os 28 testes
  pgTAP em um Supabase local isolado no GitHub Actions, acionado em Pull Requests para `main`,
  sem credenciais, `service_role` ou conexão com o projeto remoto.

### Observações

- Nenhuma autenticação foi implementada.
- A migration de `public.dj_profiles` está preparada localmente, mas não foi aplicada ao
  Supabase remoto. Nenhuma tabela foi criada no projeto remoto.
- Os testes pgTAP foram criados, mas ainda não executados: o ambiente local não possui Docker
  nem PostgreSQL. O workflow do GitHub Actions foi preparado para executá-los, mas ainda não foi
  executado; os 28 testes não estão declarados como aprovados.
- A conectividade com o Supabase Auth foi validada manualmente por requisições somente leitura
  aos endpoints oficiais, sem criação de sessão, usuários ou registros.
- Nenhum deploy foi realizado.

## [0.1.0] - 2026-10-31

### Adicionado

- Fundação do projeto `project-dj-ia` com React, Vite e TypeScript em strict mode.
- Tailwind CSS com tokens visuais e layout responsivo mobile-first.
- React Router com rotas para página inicial, área do DJ, prévia do painel, sala de convidados
  e página 404.
- Página inicial com apresentação do produto, explicação do fluxo por QR Code e estados
  explícitos de funcionalidades planejadas.
- Tela de login do DJ somente visual, sem autenticação ou sessão.
- Estrutura inicial do painel administrativo com indicadores e roadmap sem dados reais.
- Rota de convidados com validação local do formato do código de sala, tela de link inválido e
  aviso de funcionalidade em construção.
- Testes automatizados com Vitest e Testing Library para a página inicial, a área de convidados
  e a validação de códigos de sala.
- Configuração de ESLint, typecheck, scripts de build e documentação de arquitetura.
- Diretrizes permanentes do agente Normandy e configuração do OpenCode.

### Observações

- Nenhuma integração externa foi implementada nesta versão.
- Nenhum dado é lido, gravado ou persistido.
- Nenhum deploy foi realizado.
