import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  FakeAuthGateway,
  FakeDjProfileStore,
  makeAuthSession,
  makeDjProfile,
} from '../../test/authTestDoubles'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'

function AuthProbe() {
  const auth = useAuth()

  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="profile-status">{auth.profileStatus}</output>
      <output data-testid="profile">{auth.profile?.displayName ?? ''}</output>
      <output data-testid="error">{auth.error ?? auth.profileError ?? ''}</output>
      <button type="button" onClick={() => void auth.signOut()}>
        Encerrar sessão
      </button>
    </div>
  )
}

function renderProvider(gateway: FakeAuthGateway, store = new FakeDjProfileStore()) {
  render(
    <AuthProvider authGateway={gateway} profileStore={store}>
      <AuthProbe />
    </AuthProvider>,
  )

  return store
}

describe('AuthProvider', () => {
  it('resolves an unauthenticated session', async () => {
    renderProvider(new FakeAuthGateway())

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
  })

  it('loads the DJ profile after an authenticated session', async () => {
    const session = makeAuthSession({ metadataDisplayName: 'DJ Normandy' })
    const profile = makeDjProfile({ displayName: 'DJ Normandy' })
    const store = new FakeDjProfileStore({ profiles: [profile] })

    renderProvider(new FakeAuthGateway({ session }), store)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('profile-status')).toHaveTextContent('ready')
      expect(screen.getByTestId('profile')).toHaveTextContent('DJ Normandy')
    })
    expect(store.findCalls).toEqual([session.user.id])
  })

  it('does not load a DJ profile for an anonymous session', async () => {
    const session = makeAuthSession({ isAnonymous: true })
    const store = renderProvider(new FakeAuthGateway({ session }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
      expect(screen.getByTestId('profile-status')).toHaveTextContent('idle')
    })
    expect(store.findCalls).toHaveLength(0)
  })

  it('reports a session retrieval failure', async () => {
    renderProvider(new FakeAuthGateway({ getSessionError: new Error('offline') }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error')
      expect(screen.getByTestId('error')).toHaveTextContent(/não foi possível concluir/i)
    })
  })

  it('reports a profile loading failure', async () => {
    const store = new FakeDjProfileStore({ findError: new Error('database offline') })

    renderProvider(new FakeAuthGateway({ session: makeAuthSession() }), store)

    await waitFor(() => {
      expect(screen.getByTestId('profile-status')).toHaveTextContent('error')
      expect(screen.getByTestId('error')).toHaveTextContent(/perfil de dj/i)
    })
  })

  it('clears the local session after sign out', async () => {
    const gateway = new FakeAuthGateway({
      session: makeAuthSession(),
    })

    renderProvider(gateway)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    fireEvent.click(screen.getByRole('button', { name: /encerrar sessão/i }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
    expect(gateway.signOutCalls).toBe(1)
  })
})
