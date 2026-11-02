import type { InputHTMLAttributes } from 'react'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | null
  hint?: string
  id: string
  label: string
}

export function AuthField({
  className = '',
  error,
  hint,
  id,
  label,
  ...inputProps
}: AuthFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-zinc-300">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={`mt-2 w-full rounded-xl border bg-night-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:ring-2 ${
          error
            ? 'border-red-400/40 focus:border-red-400/60 focus:ring-red-500/15'
            : 'border-white/10 focus:border-accent-400/50 focus:ring-accent-500/20'
        } disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] leading-5 text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] leading-5 text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
