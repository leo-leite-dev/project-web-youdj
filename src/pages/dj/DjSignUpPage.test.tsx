import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FakeAuthGateway, FakeDjProfileStore } from '../../test/authTestDoubles'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { DjSignUpPage } from './DjSignUpPage'

function renderSignUp(gateway: FakeAuthGateway) {
  render(
    <MemoryRouter initialEntries={['/dj/cadastro']}>
      <AuthProvider authGateway={gateway} profileStore={new FakeDjProfileStore()}>
        <Routes>
          <Route path="/dj/cadastro" element={<DjSignUpPage />} />
          <Route path="/dj" element={<div>Login do DJ</div>} />
          <Route path="/dj/painel" element={<div>Painel autenticado</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DjSignUpPage', () => {
  it('validates password confirmation before creating an account', async () => {
    const gateway = new FakeAuthGateway()
    renderSignUp(gateway)

    fireEvent.change(screen.getByLabelText('Nome de DJ'), {
      target: { value: 'DJ Teste' },
    })
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'dj@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'outra-senha' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(gateway.signUpCalls).toHaveLength(0)
  })

  it('normalizes account details and asks the DJ to confirm their e-mail', async () => {
    const gateway = new FakeAuthGateway({
      signUpResult: { needsEmailConfirmation: true, session: null },
    })
    renderSignUp(gateway)

    fireEvent.change(screen.getByLabelText('Nome de DJ'), {
      target: { value: '  DJ   Teste  ' },
    })
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: ' DJ@Example.com ' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument()
    })
    expect(screen.getByText('dj@example.com')).toBeInTheDocument()
    expect(gateway.signUpCalls).toEqual([
      {
        displayName: 'DJ Teste',
        email: 'dj@example.com',
        password: 'senha-segura',
      },
    ])
  })
})
