import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RefreshButton } from './RefreshButton'

describe('RefreshButton', () => {
  it('renders an accessible icon-only button and invokes its callback', () => {
    const onClick = vi.fn()
    const { container } = render(<RefreshButton label="Atualizar pedidos" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Atualizar pedidos' })
    expect(button).toHaveAttribute('title', 'Atualizar pedidos')
    expect(button).toHaveTextContent('')
    expect(container.querySelector('.refresh-button__icon')).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables and marks the icon as loading while refreshing', () => {
    render(<RefreshButton label="Atualizar convidados" onClick={vi.fn()} loading />)

    expect(screen.getByRole('button', { name: 'Atualizar convidados' })).toBeDisabled()
    expect(document.querySelector('.refresh-button__icon')).toHaveClass('refresh-button__icon--loading')
  })
})
