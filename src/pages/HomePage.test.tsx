import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('presents the product and links to the DJ area', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/fila da festa/i)
    expect(screen.getByRole('link', { name: /acessar área do dj/i })).toHaveAttribute(
      'href',
      '/dj',
    )
    expect(screen.getByText(/prévia visual/i)).toBeInTheDocument()
  })
})
