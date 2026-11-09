import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjRoomManagementStore } from '../services/djRoomManagementStore'
import { DjRoomModeratorsSection } from './DjRoomModeratorsSection'

function makeStore(overrides: Partial<DjRoomManagementStore> = {}): DjRoomManagementStore {
  return {
    getRoom: vi.fn().mockResolvedValue(null),
    listModerators: vi.fn().mockResolvedValue([]),
    inviteModerator: vi.fn().mockResolvedValue(true),
    revokeModerator: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('DjRoomModeratorsSection', () => {
  it('allows the owner to invite an existing account and revoke only the room grant', async () => {
    const store = makeStore({
      listModerators: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
        { userId: 'mod-1', email: 'mod@example.test', displayName: 'DJ Moderador', createdAt: '2026-11-12T10:00:00Z' },
      ]),
    })
    render(<DjRoomModeratorsSection roomId="room-a" store={store} />)

    expect(screen.getByRole('button', { name: 'Atualizar moderadores' })).toHaveTextContent('')
    expect(await screen.findByText('Nenhum moderador nesta sala.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('E-mail de conta autenticada'), { target: { value: 'mod@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Convidar moderador' }))

    expect(await screen.findByText('DJ Moderador')).toBeInTheDocument()
    expect(store.inviteModerator).toHaveBeenCalledWith('room-a', 'mod@example.test')
    fireEvent.click(screen.getByRole('button', { name: 'Revogar acesso' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Acesso de DJ Moderador revogado.')
    expect(store.revokeModerator).toHaveBeenCalledWith('room-a', 'mod-1')
    expect(screen.queryByText('DJ Moderador')).not.toBeInTheDocument()
  })

  it('distinguishes a failed roster load from a successful empty roster', async () => {
    const store = makeStore({ listModerators: vi.fn().mockRejectedValue({ code: 'PGRST202' }) })
    render(<DjRoomModeratorsSection roomId="room-a" store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('migrations locais')
    expect(screen.queryByText('Nenhum moderador nesta sala.')).not.toBeInTheDocument()
  })
})
