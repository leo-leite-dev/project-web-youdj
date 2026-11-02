import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  FakeAuthGateway,
  FakeDjProfileStore,
  makeAuthSession,
} from '../../../test/authTestDoubles'
import { AuthProvider } from '../AuthProvider'
import { clearOAuthIntent, storeOAuthIntent } from '../lib/oauthFlow'
import { OAuthReturnHandler } from './OAuthReturnHandler'

function LocationProbe() {
  const location = useLocation()
  const state = location.state as { oauthError?: string } | null

  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="oauth-error">{state?.oauthError ?? ''}</span>
    </div>
  )
}

function renderReturnHandler(gateway: FakeAuthGateway) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider authGateway={gateway} profileStore={new FakeDjProfileStore()}>
        <OAuthReturnHandler />
        <LocationProbe />
        <Routes>
          <Route path="/dj" element={<div>Tela de login</div>} />
          <Route path="/dj/painel" element={<div>Painel do DJ</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('OAuthReturnHandler', () => {
  it('redirects to the intended destination after a successful Google login', async () => {
    clearOAuthIntent()
    storeOAuthIntent('/dj/painel')

    const gateway = new FakeAuthGateway({
      session: makeAuthSession({ metadataDisplayName: 'DJ Teste' }),
    })

    renderReturnHandler(gateway)

    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/dj/painel')
    })
  })

  it('shows the cancellation message on the login screen', async () => {
    clearOAuthIntent()
    window.history.replaceState({}, '', '/?error=access_denied&error_code=access_denied')

    renderReturnHandler(new FakeAuthGateway())

    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/dj')
    })
    expect(screen.getByTestId('oauth-error')).toHaveTextContent(/cancelou o login/i)

    window.history.replaceState({}, '', '/')
  })

  it('keeps the user in place when there is no pending destination', async () => {
    clearOAuthIntent()

    const gateway = new FakeAuthGateway({
      session: makeAuthSession({ metadataDisplayName: 'DJ Teste' }),
    })

    renderReturnHandler(gateway)

    await waitFor(() => {
      expect(gateway.getSession).toBeDefined()
    })
    expect(screen.getByTestId('pathname')).toHaveTextContent('/')
  })
})
