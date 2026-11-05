import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/authTypes'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import { makeAuthUser, makeDjProfile } from '../../test/authTestDoubles'
import { FakeRoomStore, makeRoom } from '../../test/roomTestDoubles'
import { DjDashboardPage } from './DjDashboardPage'

function makeAuthValue(): AuthContextValue {
  return {
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
}

function makeRequestStore(): DjRequestStore {
  return {
    listByRoom: vi.fn().mockResolvedValue([]),
    summary: vi.fn().mockResolvedValue({ pending: 2, approved: 3, rejected: 1 }),
    setStatus: vi.fn().mockResolvedValue(undefined),
  }
}

function renderDashboard(store: FakeRoomStore, requestStore = makeRequestStore()) {
  return render(
    <AuthContext.Provider value={makeAuthValue()}>
      <MemoryRouter>
        <DjDashboardPage roomStore={store} requestStore={requestStore} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('DjDashboardPage rooms', () => {
  it('keeps an overview summary and links to room management', async () => {
    const store = new FakeRoomStore()
    renderDashboard(store)

    expect(screen.getByText('Carregando suas salas...')).toBeInTheDocument()

    await screen.findByText('0 salas cadastradas')
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gerenciar salas' })).toHaveAttribute(
      'href',
      '/dj/painel/salas',
    )
    expect(screen.queryByLabelText('Nome da sala')).not.toBeInTheDocument()
  })

  it('lists rooms with status labels and counts the active ones', async () => {
    const store = new FakeRoomStore({
      rooms: [
        makeRoom({ name: 'Festa Alpha' }),
        makeRoom({ id: 'room-2', name: 'Aniversário da Ana', status: 'paused' }),
      ],
    })
    renderDashboard(store)

    await screen.findByText('Festa Alpha')
    expect(screen.getByText('Festa Alpha')).toHaveClass('text-yellow-400')
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText('Aniversário da Ana')).toBeInTheDocument()
    expect(screen.getByText('Pausada')).toBeInTheDocument()
    expect(screen.getByText('2 salas cadastradas')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)
  })

  it('shows request counts only, without the detailed request list', async () => {
    renderDashboard(new FakeRoomStore())

    expect(await screen.findByText('Resumo de pedidos')).toBeInTheDocument()
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
    expect(screen.getByText('Aprovados')).toBeInTheDocument()
    expect(screen.getByText('Rejeitados')).toBeInTheDocument()
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum pedido nesta seção.')).not.toBeInTheDocument()
  })

  it('shows a load error with retry and recovers', async () => {
    const store = new FakeRoomStore({ listError: new Error('Falha de rede') })
    renderDashboard(store)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar suas salas. Tente novamente.')

    store.listError = undefined
    store.rooms = [makeRoom()]

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await screen.findByText('Festa Teste')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
