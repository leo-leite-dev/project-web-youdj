import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchControl, SelectControl } from './FilterControls'

describe('FilterControls', () => {
  it('configures search label, placeholder, value and change callback', () => {
    const onChange = vi.fn()
    render(<SearchControl label="Buscar participante" placeholder="Digite um nome" value="Lia" onChange={onChange} />)

    const input = screen.getByRole('searchbox', { name: 'Buscar participante' })
    expect(input).toHaveAttribute('placeholder', 'Digite um nome')
    expect(input).toHaveValue('Lia')
    fireEvent.change(input, { target: { value: 'Caio' } })
    expect(onChange).toHaveBeenCalledWith('Caio')
  })

  it('renders configurable select options and reports the selected value', () => {
    const onChange = vi.fn()
    render(<SelectControl
      label="Ordenar:"
      value="recent"
      onChange={onChange}
      options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'title', label: 'Título (A–Z)' }]}
    />)

    const select = screen.getByRole('combobox', { name: 'Ordenar:' })
    expect(select).toHaveValue('recent')
    expect(screen.getByRole('option', { name: 'Título (A–Z)' })).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'title' } })
    expect(onChange).toHaveBeenCalledWith('title')
  })
})
