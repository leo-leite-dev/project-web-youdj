import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { getAuthErrorMessage } from '../lib/authErrors'

interface GoogleAuthButtonProps {
  destination?: string
  disabled?: boolean
  label?: string
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.51 2.75-2.06 5.08-4.39 6.64v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H1a9 9 0 0 0 0 8.1l2.97-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.92 11.43 0 9 0 5.7 0 2.9 1.6 1.3 4.12l2.67 2.07C4.68 4.24 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

export function GoogleAuthButton({
  destination,
  disabled = false,
  label = 'Continuar com Google',
}: GoogleAuthButtonProps) {
  const { signInWithGoogle } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setPending(true)
    setError(null)

    try {
      await signInWithGoogle(destination)
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError))
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || pending}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {pending ? 'Conectando ao Google...' : label}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-[11px] leading-5 text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
