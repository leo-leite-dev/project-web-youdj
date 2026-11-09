import { Search } from 'lucide-react'
import './FilterControls.css'

export interface FilterOption {
  value: string
  label: string
}

interface SearchControlProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function SearchControl({ label, placeholder, value, onChange }: SearchControlProps) {
  return (
    <label className="filter-search-control">
      <Search aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

interface SelectControlProps {
  label: string
  value: string
  options: readonly FilterOption[]
  onChange: (value: string) => void
  visuallyHiddenLabel?: boolean
}

export function SelectControl({ label, value, options, onChange, visuallyHiddenLabel = false }: SelectControlProps) {
  return (
    <label className="filter-select-control">
      <span className={visuallyHiddenLabel ? 'sr-only' : undefined}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
