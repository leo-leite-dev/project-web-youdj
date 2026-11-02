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
- Documentação da migration, das políticas de RLS e da distinção entre execução local e
  aplicação remota.
- `supabase/config.toml` com a configuração do stack local usada por `supabase start`,
  `supabase db reset` e `supabase test db`.
- Workflow `.github/workflows/supabase-tests.yml` para executar a migration e os 28 testes
  pgTAP em um Supabase local isolado no GitHub Actions, acionado em Pull Requests para `main`,
  sem credenciais, `service_role` ou conexão com o projeto remoto.
- Aplicação da migration `20261031000000_create_dj_profiles.sql` ao projeto remoto do YouDJ em
  2026-11-02, com verificação somente leitura de schema, RLS, políticas e privilégios.
- Cadastro, login, logout e observação de sessão de DJs com Supabase Auth, incluindo confirmação
  de e-mail quando exigida pelo projeto.
- Perfil de DJ tipado, leitura do próprio registro e criação idempotente em
  `public.dj_profiles`, usando a RLS existente.
- Proteção da rota `/dj/painel`, bloqueio de sessões anônimas e estados localizados para
  carregamento, falha de sessão e falha de perfil.
- Rota `/dj/cadastro`, validação dos formulários, saída da sessão e integração visual do estado
  autenticado no painel.
- Testes direcionados de validação, sessão, criação de perfil, proteção de rota e formulários;
  testes de integração usam doubles simulados.
- Login com Google via `supabase.auth.signInWithOAuth({ provider: 'google' })` nas telas de login e
  cadastro, com redirecionamento para a raiz do domínio atual, retorno ao destino pretendido e
  mensagens de erro e cancelamento em português.
- `VITE_SUPABASE_OAUTH_REDIRECT_URL` opcional para sobrescrever a URL de retorno do OAuth.
- Testes do fluxo OAuth (redirect, intenção de destino, parsing de erro, perfil reutilizado) e
  verificação do fluxo no navegador real por Chrome headless.
- `public/_redirects` reescrevendo rotas desconhecidas para `index.html` com status 200, para o
  Cloudflare Pages servir a SPA também no acesso direto e na atualização de rotas internas.
- `.nvmrc` fixando Node `22.16.0`, pois o build system do Cloudflare Pages não lê o campo
  `engines` do `package.json` e o Vite 8 exige Node `>=22.12`.

### Alterado

- Documentação de README e arquitetura atualizada com o endereço de produção
  `https://project-web-youdj.pages.dev`, as variáveis públicas do Supabase já configuradas no
  Cloudflare Pages e o preparo do build (comando `npm run build`, saída `dist/`).
- Estado do login com Google corrigido na documentação: fluxo validado com conta real, com o
  aplicativo Google OAuth ainda em modo de teste no Google Cloud (restrito a usuários de teste),
  distinguido da autenticação por e-mail/senha, cuja validação remota segue pendente.

### Observações

- A integração Auth está implementada no frontend; a confirmação de e-mail e os fluxos de
  e-mail/senha ainda não foram validados ponta a ponta com uma conta real neste projeto.
- O login com Google foi validado com conta real, incluindo o retorno pelo domínio de produção
  `https://project-web-youdj.pages.dev`; o aplicativo Google OAuth permanece em modo de teste no
  Google Cloud, o que restringe o login Google às contas adicionadas como usuários de teste e não
  afeta o login por e-mail/senha.
- A migration de `public.dj_profiles` foi aplicada ao projeto remoto do YouDJ em 2026-11-02; o
  histórico remoto registra a versão `20261031000000`.
- Os 28 testes pgTAP foram executados no workflow do GitHub Actions no PR #1 e aprovados,
  conforme o resultado do PR; não foram reexecutados após a aplicação remota.
- O isolamento entre DJs com duas contas reais ainda não foi exercitado; a evidência remota
  limita-se ao login Google validado e às consultas somente leitura anteriores.
- Não foram alterados configuração remota, migrations, políticas RLS ou dados do Supabase nesta
  implementação de autenticação. As URLs de redirecionamento e o provedor Google já estavam
  configurados no projeto remoto e apenas foram lidos para conferência.
- A criação/leitura de perfil foi validada com testes simulados; no login Google real, a
  leitura/criação do próprio perfil é executada sob a RLS existente.
- A verificação anterior de conectividade Auth usou apenas requisições de leitura e não comprova
  cadastro, confirmação ou login por e-mail/senha.
- Nenhum commit, push, deploy ou migration remota foi realizado nesta etapa.

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
