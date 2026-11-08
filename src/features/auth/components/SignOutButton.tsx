import { useState } from 'react'
import { LogOutIcon } from '../../../components/Icons'
import { useAuth } from '../AuthContext'
import { getAuthErrorMessage } from '../lib/authErrors'

interface SignOutButtonProps {
  className?: string
  iconOnly?: boolean
  label?: string
}

export function SignOutButton({ className = '', iconOnly = false, label = 'Sair' }: SignOutButtonProps) {
  const { signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setPending(true)
    setError(null)

    try {
      await signOut()
    } catch (signOutError) {
      setError(getAuthErrorMessage(signOutError))
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={pending}
        aria-label={iconOnly ? pending ? 'Saindo' : label : undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <LogOutIcon className="size-3.5" />
        <span className={iconOnly ? 'sr-only' : undefined}>{pending ? 'Saindo...' : label}</span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-56 text-[11px] leading-5 text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
