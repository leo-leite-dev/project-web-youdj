import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FakeAuthGateway, FakeDjProfileStore } from '../../../test/authTestDoubles'
import { AuthProvider } from '../AuthProvider'
import { GoogleAuthButton } from './GoogleAuthButton'

const redirectMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/oauthNavigation', () => ({
  redirectToAuthorization: redirectMock,
}))

function renderButton(gateway: FakeAuthGateway) {
  render(
    <MemoryRouter>
      <AuthProvider authGateway={gateway} profileStore={new FakeDjProfileStore()}>
        <GoogleAuthButton destination="/dj/painel" />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('GoogleAuthButton', () => {
  it('starts the Google flow with the authorized redirect and the intended destination', async () => {
    redirectMock.mockClear()
    const gateway = new FakeAuthGateway()

    renderButton(gateway)

    fireEvent.click(screen.getByRole('button', { name: /continuar com google/i }))

    await waitFor(() => {
      expect(gateway.oauthCalls).toHaveLength(1)
    })

    expect(gateway.oauthCalls[0]).toEqual({
      provider: 'google',
      redirectTo: 'http://localhost:3000/',
    })
    expect(redirectMock).toHaveBeenCalledWith(gateway.oauthUrl)
  })

  it('shows a Portuguese message when the provider fails', async () => {
    redirectMock.mockClear()
    const gateway = new FakeAuthGateway({
      oauthError: new Error('provider indisponível'),
    })

    renderButton(gateway)

    fireEvent.click(screen.getByRole('button', { name: /continuar com google/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
