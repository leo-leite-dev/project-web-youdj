# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
versionamento semântico.

## [Unreleased]

### Adicionado

- Ícones synthwave para ações dos cards de salas e exclusão permanente com confirmação. A RPC `dj_delete_room` é restrita ao proprietário e remove dados vinculados em cascata; o responsável confirmou que a migration `20261118000000_add_owner_room_deletion.sql` já foi aplicada ao Supabase remoto. Nenhuma migration remota foi executada nesta tarefa.
- Refinamento mobile do gerenciamento de sala com banner YouDJ e atalhos acessíveis para Salas/logout; na aba “Fila e Player”, informações e controles foram reposicionados abaixo do iframe oficial, mantendo o mesmo player. A fila fica no fluxo vertical normal da página em mobile, sem scroll aninhado; o layout desktop é preservado.
- Busca de vídeos do YouTube na aba “Fila e Player”, com resultados sob demanda usando a Pages Function existente (chave da API somente no servidor), validação de capa e estados de carregamento/vazio/erro. A inclusão direta idempotente via RPC autenticada, suporte a origem DJ na fila e migration `20261117000000_add_dj_youtube_tracks_to_queue.sql` foram implementados; migrations 11–17 foram confirmadas no histórico remoto pelo responsável.
- Histórico persistente de reprodução por pedido: o estado “Tocada” só é gravado quando o player oficial emite `PLAYING`, sem mudar aprovação/fila. A aba Aprovados atualiza por polling; migration `20261116000000_add_room_playback_history.sql` consta no histórico remoto informado pelo responsável.

- Convidados VIP por sala: somente o proprietário concede/revoga “Pedidos sem aprovação”. O convidado usa credencial aleatória privada por sala/navegador, armazenada somente como hash no banco; pedidos VIP são aprovados atomicamente e adicionados ao fim da fila. Migration `20261115000000_room_guest_vip.sql` e testes pgTAP estão versionados; a aplicação consta no histórico remoto confirmado pelo responsável.
- Atualização automática dos pedidos da sala a cada 5 segundos enquanto a seção Pedidos estiver aberta, incluindo contadores de pendentes/aprovados/rejeitados; mantém atualização manual, abas, lista e reprodução sem recarregar a página.
- Player oficial do YouTube na aba “Fila e Player”, iniciado somente por ação do DJ, com pausa, avanço manual/automático ao término, retorno acessível para bloqueio de autoplay e mensagens para vídeos indisponíveis. O controle de itens já iniciados fica no `sessionStorage` da aba; não sincroniza reprodução entre dispositivos nem grava progresso no banco. A API oficial mantém seus controles visíveis; nenhum áudio é extraído.
- Player e iframe permanecem montados ao alternar entre as abas “Fila e Player” e “Pedidos”; durante a aba Pedidos o player continua visível e mantém reprodução, música atual e controles na mesma instância.
- Recuperação do player: o item atual é guardado separadamente da lista de músicas iniciadas; registros antigos da chave de sessão não bloqueiam uma fila nova. Se todos os itens da sessão terminarem, o DJ pode reiniciar explicitamente a fila.
- A aba “Fila e Player” separa “Tocando agora” (capa, título, artista, convidado e status) das próximas músicas. A faixa atual e as já iniciadas não aparecem entre as próximas; reordenar essa lista mantém a música atual e a reprodução intactas.
- O host persistente do player no layout do painel alterna o mesmo iframe oficial entre a apresentação completa na aba “Fila e Player” e o mini-player flutuante ao navegar para outras abas/páginas; mini-player não aparece antes do DJ iniciar uma música.
- Etapa 1 da fila por sala: aprovações adicionam o pedido ao final uma única vez; DJ pode reordenar/remover sem alterar status. A migration `20261114000000_add_room_music_queue.sql` cria tabela privada e RPCs por sala para owner/moderator; consta como aplicada no histórico remoto informado pelo responsável.
- “Meus pedidos” na sala do convidado e na confirmação de envio, com estados `pending`, `approved` e `rejected`, comprovantes privados mantidos localmente por sala e importação manual. A consulta server-side usa somente SHA-256 dos comprovantes e a RPC `guest_list_requests_by_receipt_hashes`; migrations 11–17 foram confirmadas no histórico remoto pelo responsável. O workflow Supabase também roda em push para `develop`.
- O painel não exibe mais “Visão geral”: `/dj/painel` redireciona para Salas. Na confirmação de pedido, “Pedir outra música” volta ao formulário sem reenviar o pedido, apagar o comprovante, reiniciar presença ou remover o aceite dos termos. `npm run dev` inicia Vite/HMR e Wrangler para que as Pages Functions locais respondam às chamadas `/api`.
- Gerenciamento por sala com identificação `DJ: [nome do perfil]`, papéis de proprietário/moderador/convidado, convites e revogações owner-only, e RPCs server-side para leitura de presença/pedidos e moderação. A migration 11 preserva a RPC legada `submit_guest_request` para o Pages Function já publicado; a migration 12 mantém o contrato de sete colunas de `room_by_code` e oferece `room_by_code_with_membership` à nova interface. Migrations 11–17 foram confirmadas pelo responsável com `supabase migration list --remote`.
- A página administrativa remove “Entrar na sala”; falhas ao carregar pedidos/presença agora ficam distintas dos estados vazios e oferecem nova tentativa. Busca YouTube, cache, contador e visual Synthwave foram mantidos.
- Etapa 4B: busca visual do YouTube iniciada pela lupa, seleção e confirmação do convidado; seção de pedidos pendentes no painel, aprovação/rejeição por RPC autenticada e pedidos aprovados separados, sem playlist/reprodução. Os 165 testes pgTAP passaram no GitHub Actions do PR #3; a migration de moderação 11–12 consta no histórico remoto confirmado pelo responsável.
- A busca mantém o cache e passa a exibir um contador global estimado de chamadas `search.list` iniciadas pelo YouDJ, com reset à meia-noite do Pacífico e quota configurável (padrão 100) apenas como referência. Cache hits e envio de pedidos não contam; o Google continua sendo a autoridade da quota. As migrations locais `20261109000000` e `20261110000000` ainda não foram aplicadas remotamente.
- Antes da próxima publicação, a experiência local passa a pedir apelido no primeiro acesso, reutilizá-lo no mesmo navegador e atualizar presença por heartbeat com expiração de 90s. O painel separa pedidos e moderação por sala; a Visão geral mantém apenas contagens. A migration `20261111000000` é somente local; apelidos não são identidade verificada.
- Identidade visual Synthwave Neon nas salas públicas, usando o artwork definitivo `public/guest-room-artwork.png` abaixo da ação de retorno da sala.
- Cabeçalho da sala pública apresenta o nome ao lado do título e o código logo abaixo; a navegação administrativa e o link do logotipo são removidos da experiência de convidado. “Voltar à sala” reinicia busca e formulário na mesma sala.
- Páginas `/termos-de-uso` e `/privacidade`, links no rodapé e aceite explícito antes de buscas/envios de pedidos de convidados. Os textos são rascunhos aguardando validação do controlador, contato, retenção e revisão jurídica.
- Privacidade da Etapa 4A: migrations para função SQL de expurgo, agendamento horário opcional por `pg_cron`, código privado (somente hash persistido), versões e timestamp de aceite nos pedidos. A interface exibe o código uma vez e orienta solicitação manual de exclusão por e-mail; buscas não registram aceite persistente.
- Etapa 4A: pesquisa de vídeo via Cloudflare Pages Function e formulário manual na sala pública; pedidos são submetidos a uma função de servidor e recebem confirmação de recebimento sem promessa de aprovação ou reprodução.
- Migration `20261105000000_add_guest_requests_and_youtube_quota.sql`: pedidos pendentes vinculados à sala e ao DJ, tabelas privadas de cache, frequência e orçamento; RPCs executáveis somente por `service_role`. Aplicada ao remoto e coberta pelos testes pgTAP.
- Proteções de busca: normalização, pesquisa somente por ação explícita, cache server-side de 6 horas, até 5 resultados e deduplicação de chamadas simultâneas; sem bloqueio diário local ou bloqueio por IP/usuário. Pedidos continuam limitados a 5/IP/10 minutos. O contador da quota é estimativa e a quota personalizada efetiva ainda precisa ser confirmada no Google Cloud.
- Sem `YOUTUBE_API_KEY`, busca retorna erro de configuração explícito e pedidos manuais continuam disponíveis.
- README e AGENTS registram a procedência declarada dos assets visuais gerados por IA para o YouDJ e a política de verificar direitos de terceiros somente diante de indícios concretos.

- Preferências musicais individuais por sala (Modo Surpresa, exibição de playlist, música atual
  e pedidos dos convidados), com defaults no banco, edição autenticada pelo proprietário e RPC
  pública limitada aos booleanos de apresentação. Migration aplicada ao Supabase remoto; 105
  testes pgTAP aprovados e controles validados localmente. Playlist, reprodução e gestão de pedidos
  seguem indisponíveis no painel.

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
- Migration `supabase/migrations/20261102000000_create_rooms.sql` para a tabela `public.rooms`,
  vinculada a `public.dj_profiles` com cascade, nome de 2 a 60 caracteres, status
  (`active`/`paused`), timestamps, índice por proprietário, RLS e privilégios mínimos por coluna.
- Suíte pgTAP `supabase/tests/rooms_rls.test.sql` com 33 asserções de privilégios, isolamento
  entre DJs, bloqueio de convidados anônimos e de usuários não autenticados, constraints,
  integridade referencial e cascade.
- Feature `src/features/rooms` com tipos, validação de nome, mensagens de erro, store Supabase
  (`RoomStore`), hook `useRooms` e seção `RoomsSection` com estados de carregamento, vazio,
  erro com nova tentativa e criação com feedback.
- Integração da criação e listagem de salas no painel do DJ, com contagem de salas ativas no
  card de indicadores.
- 12 testes direcionados de validação, store (adaptador com `fetch` simulado), hook e painel.
- Migration `supabase/migrations/20261103000000_add_rooms_public_code.sql` que adiciona às
  salas um código público único de 10 caracteres (`A-Z0-9`, ~52 bits de entropia), gerado
  uniformemente no banco a partir de `gen_random_uuid()`. Inclui trigger de preenchimento,
  backfill das salas existentes preservando timestamps, constraints de unicidade/formato e a
  RPC pública `room_by_code` (`security definer`, `search_path` travado), que retorna apenas
  `code`, `name` e `status`.
- Suíte pgTAP `supabase/tests/rooms_public_code.test.sql` com 27 asserções de privilégios da
  coluna `code`, menor privilégio das funções, geração e imutabilidade dos códigos e
  comportamento da consulta pública (anon e autenticado).
- Biblioteca `qrcode` (+ `@types/qrcode`) para gerar QR Codes localmente, sem serviços externos.
- `roomLink`, `roomStatus` e `roomQr` em `src/features/rooms/lib`, `PublicRoomStore` (RPC
  `room_by_code_with_membership`) e `RoomQrPanel` com exibição e download em PNG.
- Ações de compartilhamento no painel: campo com o link público, botão "Copiar link" (com
  fallback quando a área de transferência está indisponível) e alternância do painel de QR Code.
- Página pública `/sala/:codigo` com consulta real: estados de carregamento, sala encontrada
  (nome e estado), não encontrada, indisponível (sala pausada) e erro com nova tentativa.
- Página protegida `/dj/painel/salas` com criação, listagem, compartilhamento por link/QR Code e
  ativação/pausa de salas, reutilizando o store e a seção de gerenciamento existentes.
- Atualização do `RoomStore` e do hook `useRooms` para persistir o status via Supabase e refletir a
  mudança apenas após confirmação do banco.
- Navegação para Salas habilitada nos menus desktop e mobile do painel do DJ.
- 20 testes frontend direcionados de navegação, resumo, atualização de status, store e página Salas
  aprovados; typecheck executado.
- 41 testes novos/afetados executados na etapa 3B (libs, stores, componentes, painel e página
  do convidado).

### Corrigido

- Pages Functions enviam credenciais Supabase somente no header `apikey`, compatível com a chave moderna `sb_secret_` (não JWT), sem tentar usá-la como `Authorization: Bearer`.
- Estado registrado: migration `20261105000000_add_guest_requests_and_youtube_quota.sql` aplicada e conferida no Supabase remoto YouDJ; o responsável informa a configuração das variáveis em Cloudflare Production, mas o runtime ainda não foi validado.

### Alterado

- Documentação de README e arquitetura atualizada com o endereço de produção
  `https://project-web-youdj.pages.dev`, as variáveis públicas do Supabase já configuradas no
  Cloudflare Pages e o preparo do build (comando `npm run build`, saída `dist/`).
- Estado do login com Google corrigido na documentação: fluxo validado com conta real, com o
  aplicativo Google OAuth ainda em modo de teste no Google Cloud (restrito a usuários de teste),
  distinguido da autenticação por e-mail/senha, cuja validação remota segue pendente.
- Página `/sala/:roomCode` deixou de ser uma prévia: agora consulta a sala real pela RPC
  pública e exibe nome e estado, mantendo a tela de link inválido para códigos malformados.
- Seção de salas do painel passou a expor o link público de cada sala com cópia e QR Code;
  a mensagem do estado vazio foi atualizada para refletir o compartilhamento disponível.
- A Visão Geral foi reduzida a um resumo de contagens e salas recentes; a criação e as ações de
  gerenciamento ficam na página dedicada `/dj/painel/salas`.

### Observações

- A integração Auth está implementada no frontend; a confirmação de e-mail e os fluxos de
  e-mail/senha ainda não foram validados ponta a ponta com uma conta real neste projeto.
- O login com Google foi validado com conta real, incluindo o retorno pelo domínio de produção
  `https://project-web-youdj.pages.dev`; o aplicativo Google OAuth permanece em modo de teste no
  Google Cloud, o que restringe o login Google às contas adicionadas como usuários de teste e não
  afeta o login por e-mail/senha.
- A migration de `public.dj_profiles` foi aplicada ao projeto remoto do YouDJ em 2026-11-02; o
  histórico remoto registra a versão `20261031000000`.
- A migration `20261103000000_add_rooms_public_code.sql` foi aplicada ao Supabase remoto do YouDJ;
  coluna, códigos, função pública, permissões e RLS foram confirmados por consultas somente de
  leitura. Os 88 testes pgTAP da Etapa 3B foram aprovados no GitHub Actions.
- Os 28 testes pgTAP foram executados no workflow do GitHub Actions no PR #1 e aprovados,
  conforme o resultado do PR; não foram reexecutados após a aplicação remota.
- O isolamento entre DJs com duas contas reais ainda não foi exercitado; a evidência remota
  limita-se ao login Google validado e às consultas somente leitura anteriores.
- Não foram alterados configuração remota, migrations, políticas RLS ou dados do Supabase nesta
  implementação de autenticação. As URLs de redirecionamento e o provedor Google já estavam
  configurados no projeto remoto e apenas foram lidos para conferência.
- A criação/leitura de perfil foi validada com testes simulados; no login Google real, a
  leitura/criação do próprio perfil é executada sob a RLS existente.
- A migration `20261102000000_create_rooms.sql` foi aplicada ao projeto remoto em 2026-11-02
  com `supabase db push --linked --skip-vault` e verificada por consultas somente leitura
  (tabela, RLS, políticas, privilégios, constraints, FK e preservação dos dados). Os 61 testes
  pgTAP (28 de perfis + 33 de salas) passaram no GitHub Actions; o ambiente local não possui
  Docker, Supabase CLI nem PostgreSQL.
- A migration `20261103000000_add_rooms_public_code.sql` foi aplicada posteriormente ao remoto;
  coluna, códigos, RPC, permissões e RLS foram conferidos por consultas somente de leitura. Os 88
  testes pgTAP passaram no GitHub Actions. Não houve commit, push ou deploy neste ciclo de validação.
- As correções do Cloudflare Pages feitas pelo responsável foram validadas por comparação booleana
  do bundle publicado com a `.env.local` (ambas as variáveis presentes em 2026-11-02), sem exibir
  valores.
- Os QR Codes são gerados no navegador pela biblioteca `qrcode`; a auditoria `npm audit`
  aponta apenas avisos moderados pré-existentes no toolchain de desenvolvimento
  (eslint/minimatch, dev-only), sem vulnerabilidade em `qrcode`.
- A validação manual dos fluxos autenticados em produção (login, salas, link e QR) continua
  pendente; os testes frontend usam doubles e não comprovam a RLS real do banco.
- Na etapa 3A, QR Codes, links de convidados, pedidos e pagamentos continuavam fora do escopo.
- A verificação anterior de conectividade Auth usou apenas requisições de leitura e não comprova
  cadastro, confirmação ou login por e-mail/senha.
- A etapa 2B foi commitada (`7310f73`, `f987ed6`, `a12f170`), enviada a `main` e publicada no
  Cloudflare Pages em 2026-11-02 com build de sucesso. O primeiro build ficou sem
  `VITE_SUPABASE_URL`; após a correção no painel do Cloudflare, o bundle publicado foi
  revalidado em 2026-11-02 contendo ambas as variáveis. Nenhuma migration remota foi executada
  nas etapas 2B/3B além das já autorizadas (`20261102000000`).

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
