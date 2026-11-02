import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MailIcon } from '../../components/Icons'
import { AuthField } from '../../features/auth/components/AuthField'
import { DjAuthShell } from '../../features/auth/components/DjAuthShell'
import { GoogleAuthButton } from '../../features/auth/components/GoogleAuthButton'
import { useAuth } from '../../features/auth/AuthContext'
import { getAuthErrorMessage } from '../../features/auth/lib/authErrors'
import {
  getDisplayNameError,
  getEmailError,
  getPasswordConfirmationError,
  getSignUpPasswordError,
  normalizeDisplayName,
  normalizeEmail,
} from '../../features/auth/lib/authValidation'

interface SignUpErrors {
  confirmation: string | null
  displayName: string | null
  email: string | null
  password: string | null
}

const initialErrors: SignUpErrors = {
  confirmation: null,
  displayName: null,
  email: null,
  password: null,
}

export function DjSignUpPage() {
  const { signUp, status } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<SignUpErrors>(initialErrors)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/dj/painel" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: SignUpErrors = {
      confirmation: getPasswordConfirmationError(password, confirmation),
      displayName: getDisplayNameError(displayName),
      email: getEmailError(email),
      password: getSignUpPasswordError(password),
    }

    setErrors(nextErrors)
    setFormError(null)

    if (
      nextErrors.confirmation ||
      nextErrors.displayName ||
      nextErrors.email ||
      nextErrors.password
    ) {
      return
    }

    setSubmitting(true)

    try {
      const result = await signUp({
        displayName: normalizeDisplayName(displayName),
        email: normalizeEmail(email),
        password,
      })

      if (result.needsEmailConfirmation) {
        setConfirmationEmail(normalizeEmail(email))
        setPassword('')
        setConfirmation('')
      } else {
        navigate('/dj/painel', { replace: true })
      }
    } catch (submitError) {
      setFormError(getAuthErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DjAuthShell
      panelTitle="Criar conta de DJ"
      panelDescription="Cadastre-se para acessar o painel e, futuramente, gerenciar suas salas."
    >
      {confirmationEmail ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <MailIcon className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">Confirme seu e-mail</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Enviamos um link de confirmação para{' '}
              <span className="font-medium text-zinc-200">{confirmationEmail}</span>. Depois de
              confirmar, volte e entre na área do DJ.
            </p>
          </div>

          <Link
            to="/dj"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <GoogleAuthButton />
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/8" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              ou cadastre-se com e-mail
            </span>
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <AuthField
              id="dj-display-name"
              name="displayName"
              type="text"
              label="Nome de DJ"
              required
              maxLength={80}
              autoComplete="nickname"
              placeholder="Como você quer ser chamado"
              value={displayName}
              error={errors.displayName}
              disabled={submitting}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setErrors((current) => ({ ...current, displayName: null }))
              }}
            />

            <AuthField
              id="dj-signup-email"
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
              id="dj-signup-password"
              name="password"
              type="password"
              label="Senha"
              required
              maxLength={72}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              error={errors.password}
              hint="Use pelo menos 8 caracteres."
              disabled={submitting}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((current) => ({ ...current, password: null, confirmation: null }))
              }}
            />

            <AuthField
              id="dj-password-confirmation"
              name="passwordConfirmation"
              type="password"
              label="Confirmar senha"
              required
              maxLength={72}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmation}
              error={errors.confirmation}
              disabled={submitting}
              onChange={(event) => {
                setConfirmation(event.target.value)
                setErrors((current) => ({ ...current, confirmation: null }))
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
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div className="my-6 h-px bg-white/8" />

          <p className="text-center text-xs leading-5 text-zinc-500">
            Já tem uma conta?{' '}
            <Link to="/dj" className="font-semibold text-accent-300 hover:text-accent-200">
              Entrar na área do DJ
            </Link>
          </p>
        </>
      )}
    </DjAuthShell>
  )
}
