import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjRequestStore } from '../services/djRequestStore'
import { DjRequestsSection } from './DjRequestsSection'

describe('DjRequestsSection', () => {
  it('separates all room statuses, shows the guest nickname and preserves moderation controls', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', guestName: 'Ana DJ', title: 'Pedido novo', artist: 'Canal', videoId: 'abcdefghijk', submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
        { id: 'approved-1', roomName: 'Festa', guestName: 'Bia', title: 'Pedido aprovado', artist: 'Canal', videoId: 'abcdefghijl', submittedUrl: null, status: 'approved', createdAt: '2026-11-04T11:00:00Z' },
        { id: 'rejected-1', roomName: 'Festa', guestName: 'Caio', title: 'Pedido rejeitado', artist: 'Canal', videoId: null, submittedUrl: null, status: 'rejected', createdAt: '2026-11-04T10:00:00Z' },
      ]),
      summary: vi.fn().mockResolvedValue({ pending: 1, approved: 1, rejected: 1 }),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)

    const approve = await screen.findByRole('button', { name: 'Aprovar' })
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Ana DJ')).toBeInTheDocument()
    expect(screen.getByText('Pedido aprovado')).toBeInTheDocument()
    expect(screen.getByText(/fora da playlist/i)).toBeInTheDocument()
    expect(screen.getByText('Pedido rejeitado')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Caio')).toBeInTheDocument()
    expect(store.listByRoom).toHaveBeenCalledWith('room-a')
    fireEvent.click(approve)
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'approved')
    expect((await screen.findByRole('heading', { name: /aprovados/i })).textContent).toContain('(2)')
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect((await screen.findByRole('heading', { name: /rejeitados/i })).textContent).toContain('(1)')
  })

  it('reports backend errors rather than claiming a status change', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', guestName: 'Ana', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      summary: vi.fn().mockResolvedValue({ pending: 1, approved: 0, rejected: 0 }),
      setStatus: vi.fn().mockRejectedValue(new Error('Sem autorização')),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem autorização')
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
  })

  it('confirms rejection and removes the request from the pending list', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', guestName: 'Ana', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      summary: vi.fn().mockResolvedValue({ pending: 1, approved: 0, rejected: 0 }),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido rejeitado.')
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'rejected')
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
    expect((await screen.findByRole('heading', { name: /rejeitados/i })).textContent).toContain('(1)')
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
  })
})
