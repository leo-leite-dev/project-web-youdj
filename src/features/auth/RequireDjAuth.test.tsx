import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  FakeAuthGateway,
  FakeDjProfileStore,
  makeAuthSession,
  makeDjProfile,
} from '../../test/authTestDoubles'
import { AuthProvider } from './AuthProvider'
import { RequireDjAuth } from './RequireDjAuth'

function LoginProbe() {
  const location = useLocation()
  const state =
    typeof location.state === 'object' && location.state !== null
      ? (location.state as { from?: string; reason?: string })
      : null

  return <div>{`Login: ${state?.from ?? ''} (${state?.reason ?? ''})`}</div>
}

function renderProtectedRoute(
  gateway: FakeAuthGateway,
  store = new FakeDjProfileStore(),
) {
  render(
    <MemoryRouter initialEntries={['/dj/painel']}>
      <AuthProvider authGateway={gateway} profileStore={store}>
        <Routes>
          <Route path="/dj" element={<LoginProbe />} />
          <Route element={<RequireDjAuth />}>
            <Route path="/dj/painel" element={<div>Painel protegido</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RequireDjAuth', () => {
  it('redirects unauthenticated users to login with the intended path', async () => {
    renderProtectedRoute(new FakeAuthGateway())

    await waitFor(() => {
      expect(screen.getByText(/login: \/dj\/painel \(unauthenticated\)/i)).toBeInTheDocument()
    })
    expect(screen.queryByText('Painel protegido')).not.toBeInTheDocument()
  })

  it('treats anonymous sessions as unauthorized', async () => {
    renderProtectedRoute(
      new FakeAuthGateway({ session: makeAuthSession({ isAnonymous: true }) }),
    )

    await waitFor(() => {
      expect(screen.getByText(/login: \/dj\/painel \(anonymous\)/i)).toBeInTheDocument()
    })
  })

  it('renders the protected outlet after the profile is ready', async () => {
    const session = makeAuthSession()
    const store = new FakeDjProfileStore({ profiles: [makeDjProfile()] })

    renderProtectedRoute(new FakeAuthGateway({ session }), store)

    await waitFor(() => {
      expect(screen.getByText('Painel protegido')).toBeInTheDocument()
    })
  })

  it('blocks the panel when the profile cannot be loaded', async () => {
    renderProtectedRoute(
      new FakeAuthGateway({ session: makeAuthSession() }),
      new FakeDjProfileStore({ findError: new Error('database offline') }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Não foi possível carregar seu perfil' }),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText('Painel protegido')).not.toBeInTheDocument()
  })
})
