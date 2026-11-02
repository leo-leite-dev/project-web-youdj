export const OAUTH_INTENT_STORAGE_KEY = 'youdj.oauth.intent'

const OAUTH_INTENT_TTL_MS = 10 * 60 * 1000
const DEFAULT_DJ_DESTINATION = '/dj/painel'
const OAUTH_ERROR_PARAMETERS = ['error', 'error_code', 'error_description'] as const
const LOCAL_DEVELOPMENT_PORT = '3000'

export interface OAuthCallbackError {
  code: string
  description: string | null
}

interface StoredOAuthIntent {
  createdAt: number
  path: string
}

/** Erro de configuração do fluxo OAuth, com mensagem já em português. */
export class OAuthFlowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OAuthFlowError'
  }
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Você cancelou o login com o Google. Nenhuma alteração foi feita na sua conta.',
  email_exists:
    'Já existe uma conta com este e-mail. Entre com e-mail e senha para acessar seus dados.',
  identity_already_exists:
    'Já existe uma conta com este e-mail. Entre com e-mail e senha para acessar seus dados.',
  invalid_request: 'O pedido de login com o Google não foi válido. Tente novamente.',
  oauth_provider_not_found:
    'O login com o Google está indisponível no momento. Use e-mail e senha ou tente mais tarde.',
  server_error: 'O serviço de autenticação do Google falhou. Tente novamente em instantes.',
  user_already_exists:
    'Já existe uma conta com este e-mail. Entre com e-mail e senha para acessar seus dados.',
  validation_failed: 'Não foi possível validar o e-mail informado pelo Google. Tente novamente.',
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getRedirectOverride(): string | null {
  const override = import.meta.env.VITE_SUPABASE_OAUTH_REDIRECT_URL?.trim()
  return override ? override : null
}

/**
 * URL de retorno do OAuth.
 *
 * Por padrão usamos a raiz do domínio atual, que precisa estar autorizada no painel do
 * Supabase. O destino final da navegação é resolvido no cliente após o retorno, o que
 * evita depender de rota profunda na allowlist e funciona igual em localhost e no
 * Cloudflare Pages. Pode ser sobrescrita por `VITE_SUPABASE_OAUTH_REDIRECT_URL`.
 */
export function getOAuthRedirectUrl(): string | null {
  const override = getRedirectOverride()

  if (override) {
    return isValidHttpUrl(override) ? override : null
  }

  if (typeof window === 'undefined') {
    return null
  }

  return isValidHttpUrl(window.location.origin) ? `${window.location.origin}/` : null
}

export function hasOAuthRedirectOverride(): boolean {
  return getRedirectOverride() !== null
}

/**
 * A autorização remota cobre `http://localhost:3000/**`. Em outra porta ou host local,
 * o retorno do OAuth seria rejeitado pelo Supabase.
 */
export function getLocalDevelopmentPortError(): string | null {
  if (hasOAuthRedirectOverride() || typeof window === 'undefined') {
    return null
  }

  try {
    const url = new URL(window.location.origin)

    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null
    }

    if (url.hostname === '127.0.0.1') {
      return `O login com o Google usa o host autorizado "localhost". Acesse http://localhost:${LOCAL_DEVELOPMENT_PORT} em vez de ${url.origin}.`
    }

    if (url.port === LOCAL_DEVELOPMENT_PORT || url.port === '') {
      return null
    }

    return `O login com o Google exige a porta ${LOCAL_DEVELOPMENT_PORT}. Rode o projeto com "npm run dev -- --port ${LOCAL_DEVELOPMENT_PORT}".`
  } catch {
    return null
  }
}

export function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
}

export function getDefaultDjDestination(): string {
  return DEFAULT_DJ_DESTINATION
}

export function storeOAuthIntent(path: string): void {
  if (!isSafeInternalPath(path)) {
    return
  }

  const storage = getSessionStorage()

  if (!storage) {
    return
  }

  const intent: StoredOAuthIntent = { createdAt: Date.now(), path }

  try {
    storage.setItem(OAUTH_INTENT_STORAGE_KEY, JSON.stringify(intent))
  } catch {
    // Armazenamento indisponível: o fluxo continua, apenas sem retorno automático.
  }
}

export function readOAuthIntent(): string | null {
  const storage = getSessionStorage()

  if (!storage) {
    return null
  }

  try {
    const rawIntent = storage.getItem(OAUTH_INTENT_STORAGE_KEY)

    if (!rawIntent) {
      return null
    }

    const intent = JSON.parse(rawIntent) as StoredOAuthIntent

    if (typeof intent?.path !== 'string' || !isSafeInternalPath(intent.path)) {
      return null
    }

    if (Date.now() - (intent.createdAt ?? 0) > OAUTH_INTENT_TTL_MS) {
      return null
    }

    return intent.path
  } catch {
    return null
  }
}

export function clearOAuthIntent(): void {
  const storage = getSessionStorage()

  if (!storage) {
    return
  }

  try {
    storage.removeItem(OAUTH_INTENT_STORAGE_KEY)
  } catch {
    // Ignora falhas de limpeza; a intenção expira sozinha.
  }
}

export function parseOAuthCallbackError(
  search: string,
  hash = '',
): OAuthCallbackError | null {
  const searchParams = new URLSearchParams(search.replace(/^\?/, ''))
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  const code =
    searchParams.get('error_code') ??
    searchParams.get('error') ??
    hashParams.get('error_code') ??
    hashParams.get('error')

  if (!code) {
    return null
  }

  return {
    code,
    description:
      searchParams.get('error_description') ?? hashParams.get('error_description'),
  }
}

export function getOAuthErrorMessage(code: string): string {
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    'Não foi possível concluir o login com o Google. Tente novamente ou entre com e-mail e senha.'
  )
}

export function cleanOAuthCallbackParameters(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const url = new URL(window.location.href)

    for (const parameter of OAUTH_ERROR_PARAMETERS) {
      url.searchParams.delete(parameter)
    }

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

    for (const parameter of OAUTH_ERROR_PARAMETERS) {
      hashParams.delete(parameter)
    }

    const remainingHash = hashParams.toString()
    url.hash = remainingHash ? `#${remainingHash}` : ''

    window.history.replaceState({}, '', url.toString())
  } catch {
    // URLs inválidas não devem interromper a aplicação.
  }
}

export function getOAuthErrorFromState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('oauthError' in state)) {
    return null
  }

  const { oauthError } = state

  return typeof oauthError === 'string' && oauthError ? oauthError : null
}
