import { isAuthError } from '@supabase/supabase-js'
import { OAuthFlowError } from './oauthFlow'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_address_invalid: 'Informe um e-mail válido.',
  email_exists: 'Já existe uma conta com este e-mail.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  email_provider_disabled: 'O cadastro por e-mail está temporariamente indisponível.',
  invalid_credentials: 'E-mail ou senha inválidos.',
  invalid_token: 'O link de confirmação é inválido ou expirou. Solicite um novo.',
  over_email_send_rate_limit:
    'Muitas solicitações de e-mail foram feitas. Aguarde alguns minutos e tente novamente.',
  over_request_rate_limit: 'Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.',
  same_password: 'A nova senha deve ser diferente da senha atual.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  signup_disabled: 'O cadastro está temporariamente desativado.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'A senha não atende aos requisitos mínimos de segurança.',
}

function getErrorCode(error: unknown): string | null {
  if (!isAuthError(error) || typeof error.code !== 'string') {
    return null
  }

  return error.code
}

function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true
  }

  return isAuthError(error) && error.status === undefined
}

function isMissingSupabaseConfiguration(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith('Variável de ambiente obrigatória ausente:')
  )
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof OAuthFlowError) {
    return error.message
  }

  if (isMissingSupabaseConfiguration(error)) {
    return 'Autenticação não configurada. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
  }

  const code = getErrorCode(error)

  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code]
  }

  if (isConnectionError(error)) {
    return 'Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.'
  }

  if (isAuthError(error) && error.status !== undefined && error.status >= 500) {
    return 'O serviço de autenticação está indisponível no momento. Tente novamente em instantes.'
  }

  return 'Não foi possível concluir a operação. Tente novamente.'
}

function getDataErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const { code } = error
  return typeof code === 'string' ? code : null
}

export function getProfileErrorMessage(error: unknown): string {
  if (isMissingSupabaseConfiguration(error)) {
    return 'Integração Supabase não configurada. Preencha as variáveis públicas do projeto.'
  }

  const code = getDataErrorCode(error)

  if (code === '42501') {
    return 'Sua sessão não tem permissão para acessar este perfil. Entre novamente.'
  }

  if (code === 'PGRST301' || code === 'PGRST303') {
    return 'Sua sessão expirou. Entre novamente para carregar o perfil.'
  }

  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente.'
  }

  return 'Não foi possível carregar seu perfil de DJ. Tente novamente.'
}
