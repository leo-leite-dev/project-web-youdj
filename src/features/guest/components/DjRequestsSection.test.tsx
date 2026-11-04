import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjRequestStore } from '../services/djRequestStore'
import { DjRequestsSection } from './DjRequestsSection'

describe('DjRequestsSection', () => {
  it('separates pending and approved requests and confirms owner decisions', async () => {
    const store: DjRequestStore = {
      list: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', title: 'Pedido novo', artist: 'Canal', videoId: 'abcdefghijk', submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
        { id: 'approved-1', roomName: 'Festa', title: 'Pedido aprovado', artist: 'Canal', videoId: 'abcdefghijl', submittedUrl: null, status: 'approved', createdAt: '2026-11-04T11:00:00Z' },
      ]),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection store={store} />)

    const approve = await screen.findByRole('button', { name: 'Aprovar' })
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
    expect(screen.getByText('Pedido aprovado')).toBeInTheDocument()
    expect(screen.getByText(/fora da playlist/i)).toBeInTheDocument()
    fireEvent.click(approve)
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'approved')
    expect((await screen.findByRole('heading', { name: /aprovados/i })).textContent).toContain('(2)')
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
  })

  it('reports backend errors rather than claiming a status change', async () => {
    const store: DjRequestStore = {
      list: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      setStatus: vi.fn().mockRejectedValue(new Error('Sem autorização')),
    }
    render(<DjRequestsSection store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem autorização')
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
  })

  it('confirms rejection and removes the request from the pending list', async () => {
    const store: DjRequestStore = {
      list: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido rejeitado.')
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'rejected')
    expect(screen.queryByText('Pedido novo')).not.toBeInTheDocument()
  })
})
