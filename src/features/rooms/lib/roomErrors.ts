function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const { code } = error
  return typeof code === 'string' ? code : null
}

function isConnectionError(error: unknown): boolean {
  return error instanceof TypeError
}

function isMissingSupabaseConfiguration(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith('Variável de ambiente obrigatória ausente:')
  )
}

/**
 * Mensagem de falha em operações de salas.
 *
 * `fallback` é usado quando o erro não tem código reconhecido, permitindo que
 * a chamada descreva a operação (carregar ou criar) sem duplicar o mapeamento.
 */
export function getRoomErrorMessage(error: unknown, fallback: string): string {
  if (isMissingSupabaseConfiguration(error)) {
    return 'Integração Supabase não configurada. Preencha as variáveis públicas do projeto.'
  }

  const code = getErrorCode(error)

  if (code === '42501') {
    return 'Sua conta não tem permissão para esta sala. Confirme se você é o proprietário ou moderador convidado.'
  }

  if (code === 'PGRST202' || code === '42883') {
    return 'A API de salas ainda não está disponível neste backend. Confira as migrations locais de presença e permissões e a atualização do schema do Supabase.'
  }

  if (code === '23514') {
    return 'O nome da sala não atende aos requisitos permitidos.'
  }

  if (isConnectionError(error)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  return fallback
}
