import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthApiError } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FakeAuthGateway, FakeDjProfileStore, makeAuthSession } from '../../test/authTestDoubles'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { DjLoginPage } from './DjLoginPage'

function renderLogin(gateway: FakeAuthGateway) {
  render(
    <MemoryRouter initialEntries={['/dj']}>
      <AuthProvider authGateway={gateway} profileStore={new FakeDjProfileStore()}>
        <Routes>
          <Route path="/dj" element={<DjLoginPage />} />
          <Route path="/dj/painel" element={<div>Painel autenticado</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DjLoginPage', () => {
  it('validates required fields before sending credentials', async () => {
    const gateway = new FakeAuthGateway()
    renderLogin(gateway)

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(gateway.signInCalls).toHaveLength(0)
  })

  it('normalizes the e-mail and navigates after a successful login', async () => {
    const gateway = new FakeAuthGateway({ signInSession: makeAuthSession() })
    renderLogin(gateway)

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: '  DJ@Example.com ' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Painel autenticado')).toBeInTheDocument()
    })
    expect(gateway.signInCalls).toEqual([
      { email: 'dj@example.com', password: 'senha-segura' },
    ])
  })

  it('shows a friendly authentication error', async () => {
    const gateway = new FakeAuthGateway({
      signInError: new AuthApiError('invalid credentials', 400, 'invalid_credentials'),
    })
    renderLogin(gateway)

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'dj@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
  })
})
