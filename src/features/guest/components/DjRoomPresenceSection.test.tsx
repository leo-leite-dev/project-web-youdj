import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjPresenceStore } from '../services/djPresenceStore'
import { DjRoomPresenceSection } from './DjRoomPresenceSection'

describe('DjRoomPresenceSection', () => {
  it('shows the empty state only after a successful zero-presence response', async () => {
    const store: DjPresenceStore = { listOnline: vi.fn().mockResolvedValue({ count: 0, guests: [] }) }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    expect(await screen.findByText('Nenhum convidado por link está online no momento.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an RPC error and retry action instead of an empty-presence claim', async () => {
    const store: DjPresenceStore = { listOnline: vi.fn().mockRejectedValue({ code: 'PGRST202' }) }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('migrations locais')
    expect(screen.queryByText('Nenhum convidado por link está online no momento.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('lets the room owner grant and revoke VIP through available card actions', async () => {
    const setVip = vi.fn().mockResolvedValue(true)
    const store: DjPresenceStore = {
      listOnline: vi.fn()
        .mockResolvedValueOnce({ count: 1, guests: [{
        nickname: 'Lia', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-07T12:00:00Z',
      }] })
        .mockResolvedValue({ count: 1, guests: [{
          nickname: 'Lia', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: true, lastSeenAt: '2026-11-07T12:00:00Z',
        }] }),
      listVips: vi.fn().mockResolvedValue([]),
      setVip,
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} canManageVip />)

    fireEvent.click(await screen.findByLabelText('Mais ações para Lia'))
    fireEvent.click(screen.getByRole('button', { name: 'Conceder VIP' }))
    expect(setVip).toHaveBeenCalledWith('room-a', 'a1111111-1111-4111-8111-111111111111', true)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('concedida'))
    fireEvent.click(await screen.findByLabelText('Mais ações para Lia'))
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar VIP' }))
    expect(setVip).toHaveBeenLastCalledWith('room-a', 'a1111111-1111-4111-8111-111111111111', false)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('revogada'))
  })

  it('does not expose VIP controls to non-owners', async () => {
    const store: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({ count: 1, guests: [{
        nickname: 'Lia', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-07T12:00:00Z',
      }] }),
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    expect(await screen.findByText('Lia')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conceder VIP' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar VIP' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mais ações para Lia')).not.toBeInTheDocument()
  })

  it('does not show the VIP action menu when the presence response has no usable guest ID', async () => {
    const store: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({ count: 1, guests: [{
        nickname: 'Lia', guestId: null, isVip: false, lastSeenAt: '2026-11-07T12:00:00Z',
      }] }),
      setVip: vi.fn(),
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} canManageVip />)

    expect(await screen.findByText('Lia')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mais ações para Lia')).not.toBeInTheDocument()
  })

  it('keeps online guests visible when the VIP roster RPC is not installed yet', async () => {
    const store: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({ count: 1, guests: [{
        nickname: 'Leonardo', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-07T12:00:00Z',
      }] }),
      listVips: vi.fn().mockRejectedValue({ code: 'PGRST202' }),
      setVip: vi.fn(),
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} canManageVip />)

    expect(await screen.findByText('Leonardo')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Mais ações para Leonardo'))
    expect(screen.getByRole('button', { name: 'Conceder VIP' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/RPCs de Convidado VIP não estão disponíveis/i)
  })

  it('renders only available guest details and filters sections by search and access level', async () => {
    const store: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({ count: 2, guests: [
        { nickname: 'Lia Prado', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-07T12:00:00Z' },
        { nickname: 'Caio', guestId: 'b1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-07T11:30:00Z' },
      ] }),
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    const refreshButton = screen.getByRole('button', { name: 'Atualizar convidados' })
    expect(document.querySelector('.room-presence-heading-row')).toContainElement(refreshButton)
    expect(await screen.findByText('LP')).toBeInTheDocument()
    expect(screen.getAllByText('Online')).toHaveLength(2)
    expect(screen.getAllByText(/Última atividade:/)).toHaveLength(2)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar participante' }), { target: { value: 'lia' } })
    expect(screen.getByText('Lia Prado')).toBeInTheDocument()
    expect(screen.queryByText('Caio')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar participante' }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por nível' }), { target: { value: 'vip' } })
    expect(await screen.findByText('A lista VIP é exibida somente ao proprietário da sala.')).toBeInTheDocument()
    expect(screen.queryByText('Lia Prado')).not.toBeInTheDocument()
  })

  it('prioritizes verified VIPs, avoids duplicates, and keeps registered identities explicitly empty', async () => {
    const vipId = 'a1111111-1111-4111-8111-111111111111'
    const offlineVipId = 'b1111111-1111-4111-8111-111111111111'
    const store: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({ count: 2, guests: [
        { nickname: 'Marina', guestId: vipId, isVip: true, lastSeenAt: '2026-11-08T12:00:00Z' },
        { nickname: 'Ana', guestId: 'c1111111-1111-4111-8111-111111111111', isVip: false, lastSeenAt: '2026-11-08T11:30:00Z' },
      ] }),
      listVips: vi.fn().mockResolvedValue([
        { nickname: 'Marina', guestId: vipId, grantedAt: '2026-11-07T12:00:00Z' },
        { nickname: 'Rafa', guestId: offlineVipId, grantedAt: '2026-11-07T10:00:00Z' },
      ]),
      setVip: vi.fn().mockResolvedValue(true),
    }
    render(<DjRoomPresenceSection roomId="room-a" store={store} canManageVip />)

    expect(await screen.findByText('Marina')).toBeInTheDocument()
    expect(screen.getAllByText('Marina')).toHaveLength(1)
    expect(screen.getByText('Rafa')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText(/identidade autenticada\/verificada/)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por nível' }), { target: { value: 'vip' } })
    expect(screen.getByText('Marina')).toBeInTheDocument()
    expect(screen.getByText('Rafa')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    const vipTitle = document.querySelector('.room-guest-level--vip .room-guest-level__title')
    expect(vipTitle).toHaveTextContent('VIPs (2)')
    const vipPanel = vipTitle?.closest('details')
    expect(vipPanel).toHaveAttribute('open')
    if (!vipTitle) throw new Error('VIP section title was not rendered')
    fireEvent.click(vipTitle)
    expect(vipPanel).not.toHaveAttribute('open')
  })
})
