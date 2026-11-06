import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthContextValue } from '../features/auth/authTypes'
import { makeAuthUser, makeDjProfile } from '../test/authTestDoubles'
import { AppRoutes } from './AppRoutes'

vi.mock('../pages/dj/DjRoomsPage', () => ({
  DjRoomsPage: () => <h1>Salas do DJ</h1>,
}))

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

const authenticatedDj: AuthContextValue = {
  error: null,
  profile: makeDjProfile(),
  profileError: null,
  profileStatus: 'ready',
  refreshSession: () => {},
  retryProfile: () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  signUp: async () => ({ needsEmailConfirmation: false }),
  status: 'authenticated',
  user: makeAuthUser(),
}

const unauthenticatedDj: AuthContextValue = {
  ...authenticatedDj,
  profile: null,
  profileStatus: 'idle',
  status: 'unauthenticated',
  user: null,
}

describe('AppRoutes', () => {
  it('redirects the protected panel index to Salas', async () => {
    render(
      <AuthContext.Provider value={authenticatedDj}>
        <MemoryRouter initialEntries={['/dj/painel']}>
          <AppRoutes />
          <CurrentPath />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'Salas do DJ' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dj/painel/salas')
  })

  it('still requires authentication before redirecting to the panel destination', async () => {
    render(
      <AuthContext.Provider value={unauthenticatedDj}>
        <MemoryRouter initialEntries={['/dj/painel']}>
          <AppRoutes />
          <CurrentPath />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/dj'))
    expect(screen.queryByRole('heading', { name: 'Salas do DJ' })).not.toBeInTheDocument()
  })
})
