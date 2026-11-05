import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PublicLayout } from './PublicLayout'

function renderPath(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/sala/:roomCode" element={<p>Sala pública</p>} />
          <Route path="/" element={<p>Página inicial</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicLayout', () => {
  it('remove links administrativos e desativa o logotipo nas salas públicas', () => {
    renderPath('/sala/A1B2C3D4E5')

    expect(screen.getByRole('img', { name: 'DJ IA' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /DJ IA/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Área do DJ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
  })

  it('preserva a navegação administrativa fora das salas', () => {
    renderPath('/')

    const header = within(screen.getByRole('banner'))
    expect(header.getByRole('link', { name: 'DJ IA — página inicial' })).toHaveAttribute('href', '/')
    expect(header.getByRole('link', { name: 'Área do DJ' })).toHaveAttribute('href', '/dj')
  })
})
