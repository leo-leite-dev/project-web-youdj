import { Link } from 'react-router-dom'
import { MusicIcon } from './Icons'

interface BrandProps {
  to?: string
  compact?: boolean
}

export function Brand({ to = '/', compact = false }: BrandProps) {
  return (
    <Link
      to={to}
      aria-label="DJ IA — página inicial"
      className="group inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-950"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-accent-500 to-neon-400 text-night-950 shadow-lg shadow-accent-500/20 transition-transform group-hover:scale-105">
        <MusicIcon className="size-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-[0.22em] text-white">DJ IA</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            music requests
          </span>
        </span>
      )}
    </Link>
  )
}
