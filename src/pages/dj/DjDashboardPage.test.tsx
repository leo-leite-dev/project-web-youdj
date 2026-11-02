import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/authTypes'
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

function renderDashboard(store: FakeRoomStore) {
  return render(
    <AuthContext.Provider value={makeAuthValue()}>
      <DjDashboardPage roomStore={store} />
    </AuthContext.Provider>,
  )
}

describe('DjDashboardPage rooms', () => {
  it('loads, shows the empty state and creates the first room', async () => {
    const store = new FakeRoomStore()
    renderDashboard(store)

    expect(screen.getByText('Carregando suas salas...')).toBeInTheDocument()

    await screen.findByText('Nenhuma sala criada')
    expect(screen.getByText('0')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome da sala'), {
      target: { value: 'Festa Teste' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar sala' }))

    await screen.findByText('Festa Teste')
    expect(store.createCalls).toEqual([
      { djId: makeDjProfile().id, name: 'Festa Teste' },
    ])
    expect(screen.getByLabelText('Nome da sala')).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('Sala criada com sucesso.')
    expect(screen.getByText('1')).toBeInTheDocument()
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
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText('Aniversário da Ana')).toBeInTheDocument()
    expect(screen.getByText('Pausada')).toBeInTheDocument()
    expect(screen.getByText('2 salas')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
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
