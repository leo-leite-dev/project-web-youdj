import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangleIcon } from '../../components/Icons'
import { Brand } from '../../components/Brand'
import { useAuth } from './AuthContext'
import { SignOutButton } from './components/SignOutButton'

interface AccessStateProps {
  actions?: ReactNode
  description: string
  icon?: ReactNode
  title: string
}

function AccessState({ actions, description, icon, title }: AccessStateProps) {
  return (
    <div className="flex min-h-svh flex-col bg-night-950">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <Link
            to="/"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
          >
            Início
          </Link>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-night-900/70 p-7 text-center shadow-2xl shadow-black/30 sm:p-9">
          {icon}
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
          {actions ? (
            <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row">
              {actions}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function LoadingState({ title }: { title: string }) {
  return (
    <AccessState
      title={title}
      description="Aguarde enquanto confirmamos sua sessão com segurança."
      icon={
        <span
          aria-hidden="true"
          className="mx-auto block size-10 animate-spin rounded-full border-2 border-white/10 border-t-accent-400"
        />
      }
    />
  )
}

export function RequireDjAuth() {
  const {
    error,
    profileError,
    profileStatus,
    refreshSession,
    retryProfile,
    status,
  } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState title="Verificando sua sessão" />
  }

  if (status === 'error') {
    return (
      <AccessState
        title="Não foi possível verificar sua sessão"
        description={error ?? 'O serviço de autenticação não respondeu. Tente novamente.'}
        icon={
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
            <AlertTriangleIcon className="size-5" />
          </span>
        }
        actions={
          <button
            type="button"
            onClick={refreshSession}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-night-950 transition hover:bg-accent-300"
          >
            Tentar novamente
          </button>
        }
      />
    )
  }

  if (status === 'unauthenticated' || status === 'anonymous') {
    return (
      <Navigate
        to="/dj"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          reason: status,
        }}
      />
    )
  }

  if (profileStatus === 'loading' || profileStatus === 'idle') {
    return <LoadingState title="Carregando seu perfil" />
  }

  if (profileStatus === 'error') {
    return (
      <AccessState
        title="Não foi possível carregar seu perfil"
        description={profileError ?? 'Tente novamente para acessar o painel.'}
        icon={
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <AlertTriangleIcon className="size-5" />
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={retryProfile}
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-night-950 transition hover:bg-accent-300"
            >
              Tentar novamente
            </button>
            <SignOutButton />
          </>
        }
      />
    )
  }

  return <Outlet />
}
