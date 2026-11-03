import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FakePublicRoomStore, makePublicRoom } from '../../test/roomTestDoubles'
import { GuestRoomPage } from './GuestRoomPage'

function renderRoom(path: string, store: FakePublicRoomStore) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sala/:roomCode" element={<GuestRoomPage store={store} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestRoomPage', () => {
  it('shows an invalid link message for malformed room codes without querying', () => {
    const store = new FakePublicRoomStore()
    renderRoom('/sala/abc', store)

    expect(screen.getByRole('heading', { name: /link inválido/i })).toBeInTheDocument()
    expect(screen.getByText(/deve ter 10 letras ou números/i)).toBeInTheDocument()
    expect(store.findCalls).toHaveLength(0)
  })

  it('loads the room and shows its name and status', async () => {
    const store = new FakePublicRoomStore({
      rooms: [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa da Ana' })],
    })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByText('Festa da Ana')).toBeInTheDocument()
    expect(store.findCalls).toEqual(['A1B2C3D4E5'])
    expect(screen.getByRole('heading', { name: 'Sala A1B2C3D4E5' })).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText(/pedidos musicais estarão disponíveis em breve/i)).toBeInTheDocument()
  })

  it('shows when the room does not exist', async () => {
    const store = new FakePublicRoomStore()
    renderRoom('/sala/ZZ99ZZ99ZZ', store)

    expect(await screen.findByRole('heading', { name: /sala não encontrada/i })).toBeInTheDocument()
    expect(screen.getByText(/não corresponde a nenhuma sala/i)).toBeInTheDocument()
  })

  it('shows the unavailable state for a paused room', async () => {
    const store = new FakePublicRoomStore({
      rooms: [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa Pausada', status: 'paused' })],
    })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByText(/pausado no momento/i)).toBeInTheDocument()
    expect(screen.getByText('Pausada')).toBeInTheDocument()
  })

  it('retries after a load error and then shows the room', async () => {
    const store = new FakePublicRoomStore({ findError: new Error('falha de rede') })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByRole('heading', { name: /não foi possível carregar/i })).toBeInTheDocument()
    expect(screen.getByText(/não foi possível carregar a sala/i)).toBeInTheDocument()

    store.findError = undefined
    store.rooms = [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa da Ana' })]

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Festa da Ana')).toBeInTheDocument()
  })
})
