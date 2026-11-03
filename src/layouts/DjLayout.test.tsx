import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthContextValue } from '../features/auth/authTypes'
import { makeAuthUser, makeDjProfile } from '../test/authTestDoubles'
import { DjLayout } from './DjLayout'

const authValue: AuthContextValue = {
  error: null,
  profile: makeDjProfile(),
  profileError: null,
  profileStatus: 'ready',
  refreshSession: () => {},
  retryProfile: () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: () => Promise.resolve(),
  signUp: async () => ({ needsEmailConfirmation: false }),
  status: 'authenticated',
  user: makeAuthUser(),
}

describe('DjLayout navigation', () => {
  it('provides active Salas links on desktop and mobile without an upcoming badge', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas" element={<h1>Gerenciamento de salas</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Gerenciamento de salas' })).toBeInTheDocument()
    const roomLinks = screen.getAllByRole('link', { name: 'Salas' })
    expect(roomLinks).toHaveLength(2)
    expect(roomLinks.every((link) => link.getAttribute('href') === '/dj/painel/salas')).toBe(true)
    expect(roomLinks.every((link) => link.className.includes('text-accent-300'))).toBe(true)
    roomLinks.forEach((link) => {
      expect(within(link).queryByText('em breve')).not.toBeInTheDocument()
    })
    expect(
      within(screen.getByRole('navigation', { name: 'Navegação do painel' })).getByText('Salas'),
    ).toBeInTheDocument()
  })
})
