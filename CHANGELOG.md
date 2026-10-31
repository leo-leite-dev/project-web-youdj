# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
versionamento semântico.

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
