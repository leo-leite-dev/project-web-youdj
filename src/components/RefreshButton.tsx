import { RefreshCw } from 'lucide-react'
import './RefreshButton.css'

interface RefreshButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function RefreshButton({ label, onClick, disabled = false, loading = false, className = '' }: RefreshButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled || loading}
      className={`refresh-button ${className}`.trim()}
    >
      <RefreshCw aria-hidden="true" className={`refresh-button__icon${loading ? ' refresh-button__icon--loading' : ''}`} />
    </button>
  )
}
