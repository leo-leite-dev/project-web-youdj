interface PlannedBadgeProps {
  label?: string
  className?: string
}

export function PlannedBadge({ label = 'Planejado', className = '' }: PlannedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent-400/25 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-300 ${className}`}
    >
      <span className="size-1.5 rounded-full bg-accent-400" />
      {label}
    </span>
  )
}
