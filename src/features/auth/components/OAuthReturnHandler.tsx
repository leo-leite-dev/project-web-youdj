import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import {
  cleanOAuthCallbackParameters,
  clearOAuthIntent,
  getOAuthErrorMessage,
  parseOAuthCallbackError,
  readOAuthIntent,
} from '../lib/oauthFlow'

const OAUTH_CALLBACK_PATH = '/'

/**
 * Trata o retorno do OAuth no app.
 *
 * O provedor retorna para a raiz do domínio, onde o Supabase Auth conclui a sessão.
 * A partir daí, o usuário é levado ao destino pretendido ou recebe a mensagem de
 * erro/cancelamento em português na tela de login.
 *
 * A ação só acontece na raiz porque é o único caminho usado como retorno do OAuth.
 * Isso evita que uma intenção antiga redirecione o usuário em outras páginas.
 */
export function OAuthReturnHandler() {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [callbackError] = useState(() =>
    typeof window === 'undefined'
      ? null
      : parseOAuthCallbackError(window.location.search, window.location.hash),
  )

  useEffect(() => {
    if (location.pathname !== OAUTH_CALLBACK_PATH) {
      return
    }

    if (callbackError) {
      cleanOAuthCallbackParameters()
      clearOAuthIntent()
      navigate('/dj', {
        replace: true,
        state: { oauthError: getOAuthErrorMessage(callbackError.code) },
      })
      return
    }

    if (status !== 'authenticated') {
      return
    }

    const intent = readOAuthIntent()

    if (!intent) {
      return
    }

    clearOAuthIntent()
    navigate(intent, { replace: true })
  }, [callbackError, location.pathname, navigate, status])

  return null
}
