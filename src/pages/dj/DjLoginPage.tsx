import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GoogleAuthButton } from '../../features/auth/components/GoogleAuthButton'
import { DjAuthShell } from '../../features/auth/components/DjAuthShell'
import { AuthField } from '../../features/auth/components/AuthField'
import { useAuth } from '../../features/auth/AuthContext'
import { getAuthErrorMessage } from '../../features/auth/lib/authErrors'
import { getDjRedirectTarget, isAnonymousRedirect } from '../../features/auth/lib/authRedirect'
import {
  getEmailError,
  getLoginPasswordError,
  normalizeEmail,
} from '../../features/auth/lib/authValidation'
import { getOAuthErrorFromState } from '../../features/auth/lib/oauthFlow'

interface LoginErrors {
  email: string | null
  password: string | null
}

const initialErrors: LoginErrors = {
  email: null,
  password: null,
}

export function DjLoginPage() {
  const { signIn, status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>(initialErrors)
  const [formError, setFormError] = useState<string | null>(
    () => getOAuthErrorFromState(location.state),
  )
  const [submitting, setSubmitting] = useState(false)

  const redirectTarget = getDjRedirectTarget(location.state)

  if (status === 'authenticated') {
    return <Navigate to={redirectTarget} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: LoginErrors = {
      email: getEmailError(email),
      password: getLoginPasswordError(password),
    }

    setErrors(nextErrors)
    setFormError(null)

    if (nextErrors.email || nextErrors.password) {
      return
    }

    setSubmitting(true)

    try {
      await signIn(normalizeEmail(email), password)
      navigate(redirectTarget, { replace: true })
    } catch (submitError) {
      setFormError(getAuthErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DjAuthShell
      panelTitle="Acesso do DJ"
      panelDescription="Entre com sua conta para acessar o painel administrativo."
    >
      {isAnonymousRedirect(location.state) ? (
        <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-3 text-xs leading-5 text-amber-200/80">
          Uma sessão de convidado não concede acesso ao painel. Entre com uma conta de DJ.
        </p>
      ) : null}

      <div className="mt-6">
        <GoogleAuthButton destination={redirectTarget} />
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/8" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          ou entre com e-mail
        </span>
        <span className="h-px flex-1 bg-white/8" />
      </div>

      <form className="space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          id="dj-email"
          name="email"
          type="email"
          label="E-mail"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          error={errors.email}
          disabled={submitting}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((current) => ({ ...current, email: null }))
          }}
        />

        <AuthField
          id="dj-password"
          name="password"
          type="password"
          label="Senha"
          required
          maxLength={72}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          disabled={submitting}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: null }))
          }}
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/5 px-3.5 py-3 text-xs leading-5 text-red-200"
          >
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="my-6 h-px bg-white/8" />

      <p className="text-center text-xs leading-5 text-zinc-500">
        Ainda não tem uma conta?{' '}
        <Link to="/dj/cadastro" className="font-semibold text-accent-300 hover:text-accent-200">
          Criar conta de DJ
        </Link>
      </p>
    </DjAuthShell>
  )
}
