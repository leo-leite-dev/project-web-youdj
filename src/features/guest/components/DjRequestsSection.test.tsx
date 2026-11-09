import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjMusicQueueStore } from '../services/djMusicQueueStore'
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
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    const { rerender } = render(<DjRequestsSection roomId="room-a" store={store} />)

    const approve = await screen.findByRole('button', { name: 'Aprovar' })
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Ana DJ')).toBeInTheDocument()
    expect(screen.queryByText('Pedido aprovado')).not.toBeInTheDocument()
    expect(screen.queryByText('Pedido rejeitado')).not.toBeInTheDocument()
    expect(store.listByRoom).toHaveBeenCalledWith('room-a')
    fireEvent.click(approve)
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'approved')
    expect((await screen.findByRole('heading', { name: /pendentes/i })).textContent).toContain('(0)')
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    rerender(<DjRequestsSection roomId="room-a" store={store} filter="approved" />)
    expect(await screen.findByText('Pedido novo')).toBeInTheDocument()
    expect(screen.getByText('Pedido aprovado')).toBeInTheDocument()
    expect(screen.getAllByText('Aprovado')).toHaveLength(2)
    expect((await screen.findByRole('heading', { name: /aprovados/i })).textContent).toContain('(2)')
    rerender(<DjRequestsSection roomId="room-a" store={store} filter="rejected" />)
    expect(await screen.findByText('Pedido rejeitado')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Caio')).toBeInTheDocument()
    expect((await screen.findByRole('heading', { name: /rejeitados/i })).textContent).toContain('(1)')
  })

  it('reports backend errors rather than claiming a status change', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', guestName: 'Ana', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      setStatus: vi.fn().mockRejectedValue(new Error('Sem autorização')),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem autorização')
    expect(screen.getByText('Pedido novo')).toBeInTheDocument()
  })

  it('does not present an empty list when loading requests fails', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockRejectedValue({ code: 'PGRST202' }),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('migrations locais')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum pedido nesta seção.')).not.toBeInTheDocument()
  })

  it('shows the empty state only after a successful empty response', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([]),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)

    expect(await screen.findAllByText('Nenhum pedido pendente encontrado.')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows persistent playback status by individual request ID without changing approval', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'request-played', roomName: 'Festa', guestName: 'Bia', title: 'Faixa igual', artist: 'Canal', videoId: 'abcdefghijk', submittedUrl: null, status: 'approved', createdAt: '2026-11-04T11:00:00Z' },
        { id: 'request-waiting', roomName: 'Festa', guestName: 'Caio', title: 'Faixa igual', artist: 'Canal', videoId: 'abcdefghijk', submittedUrl: null, status: 'approved', createdAt: '2026-11-04T11:00:00Z' },
      ]),
      listPlayedRequestIds: vi.fn().mockResolvedValue(['request-played']),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} filter="approved" />)

    expect(await screen.findByText('Tocada')).toBeInTheDocument()
    expect(screen.getAllByText('Aprovado')).toHaveLength(2)
    expect(store.listPlayedRequestIds).toHaveBeenCalledWith('room-a')
  })

  it('shows the creation date and local time under the guest for pending requests', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-today', roomName: 'Festa', guestName: 'Ana', title: 'Pedido recente', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: new Date().toISOString() },
      ]),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)

    expect(await screen.findByText('Convidado: Ana')).toBeInTheDocument()
    expect(await screen.findByText(/^Hoje, \d{2}:\d{2}$/)).toBeInTheDocument()
  })

  it('confirms rejection and removes the request from the pending list', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-1', roomName: 'Festa', guestName: 'Ana', title: 'Pedido novo', artist: 'Canal', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-04T12:00:00Z' },
      ]),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection roomId="room-a" store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido rejeitado.')
    expect(store.setStatus).toHaveBeenCalledWith('pending-1', 'rejected')
    expect(screen.queryByText('Pedido novo')).not.toBeInTheDocument()
    expect((await screen.findByRole('heading', { name: /pendentes/i })).textContent).toContain('(0)')
    expect(screen.getByText('Nenhum pedido pendente encontrado.')).toBeInTheDocument()
  })

  it('renders pending requests with the dedicated card layout and keeps request details', async () => {
    const storedRequest = { id: 'pending-card', roomName: 'Festa', guestName: 'Ana', title: 'Som de verão - Topic', artist: 'Leandro & Leonardo - Topic', videoId: 'abcdefghijk', submittedUrl: null, status: 'pending' as const, createdAt: '2026-11-04T12:00:00Z' }
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([storedRequest]),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} filter="pending" />)

    const title = await screen.findByRole('heading', { name: 'Som de verão' })
    expect(title.closest('li')).toHaveClass('room-pending-card')
    expect(title.closest('li')).toHaveClass('room-approved-card')
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('Leandro & Leonardo')).toBeInTheDocument()
    expect(screen.queryByText(/Topic/i)).not.toBeInTheDocument()
    expect(title.closest('li')).toHaveTextContent('Convidado: Ana')
    expect(title.closest('li')).not.toHaveTextContent(/Na fila/)
    expect(screen.getByRole('link', { name: 'Abrir vídeo de Som de verão' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk')
    fireEvent.click(screen.getByLabelText('Mais ações para Som de verão'))
    expect(screen.getByRole('link', { name: 'Abrir vídeo' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk')
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument()
    expect(storedRequest).toMatchObject({ title: 'Som de verão - Topic', artist: 'Leandro & Leonardo - Topic' })
  })

  it('searches and sorts pending requests with oldest first by default', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending-new', roomName: 'Festa', guestName: 'Bia', title: 'Zebra', artist: 'Eletrônica', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-07T12:00:00Z' },
        { id: 'pending-old', roomName: 'Festa', guestName: 'Ana', title: 'Água', artist: 'Sertanejo', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-06T12:00:00Z' },
      ]),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    render(<DjRequestsSection roomId="room-a" store={store} filter="pending" />)

    expect(await screen.findByRole('heading', { name: 'Água' })).toBeInTheDocument()
    expect((await screen.findAllByRole('heading')).slice(-2).map((heading) => heading.textContent)).toEqual(['Água', 'Zebra'])
    expect(screen.getByRole('combobox', { name: /ordenar/i })).toHaveValue('oldest')
    expect(screen.queryByRole('button', { name: /mais ações/i })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /ordenar/i }), { target: { value: 'newest' } })
    expect((await screen.findAllByRole('heading')).slice(-2).map((heading) => heading.textContent)).toEqual(['Zebra', 'Água'])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedidos pendentes' }), { target: { value: 'ana' } })
    expect(screen.getByRole('heading', { name: 'Água' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Zebra' })).not.toBeInTheDocument())
  })

  it('renders rejected cards without queue or playback actions and filters/sorts them', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'rejected-new', roomName: 'Festa', guestName: 'Bia', title: 'Zebra hit', artist: 'Canal - Topic', videoId: 'abcdefghijk', submittedUrl: null, status: 'rejected', createdAt: '2026-11-07T12:00:00Z' },
        { id: 'rejected-old', roomName: 'Festa', guestName: 'Ana', title: 'Água de beber', artist: 'Dupla - Topic', videoId: 'abcdefghijl', submittedUrl: null, status: 'rejected', createdAt: '2026-11-06T12:00:00Z' },
      ]),
      setStatus: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} filter="rejected" />)

    expect(await screen.findByRole('heading', { name: 'Zebra hit' })).toBeInTheDocument()
    expect((await screen.findAllByRole('heading')).slice(-2).map((heading) => heading.textContent)).toEqual(['Zebra hit', 'Água de beber'])
    expect(screen.getAllByText('Rejeitado')).toHaveLength(2)
    expect(screen.getByText('Canal')).toBeInTheDocument()
    expect(screen.getByText('Dupla')).toBeInTheDocument()
    expect(screen.queryByText(/Topic|Na fila|Tocada/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mais ações/i })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /ordenar/i })).toHaveValue('newest')

    fireEvent.change(screen.getByRole('combobox', { name: /ordenar/i }), { target: { value: 'oldest' } })
    expect((await screen.findAllByRole('heading')).slice(-2).map((heading) => heading.textContent)).toEqual(['Água de beber', 'Zebra hit'])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedidos rejeitados' }), { target: { value: 'bia' } })
    expect(screen.getByRole('heading', { name: 'Zebra hit' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Água de beber' })).not.toBeInTheDocument())
  })

  it('shows real queue positions independent of visual sort and filters approved cards', async () => {
    const store: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'newer-request', roomName: 'Festa', guestName: 'Bia', title: 'Zebra hit', artist: 'Canal - Topic', videoId: 'abcdefghijk', submittedUrl: null, status: 'approved', createdAt: '2026-11-07T12:00:00Z' },
        { id: 'older-request', roomName: 'Festa', guestName: 'Ana', title: 'Água de beber', artist: 'Artista', videoId: null, submittedUrl: 'https://youtu.be/abcdefghijl', status: 'approved', createdAt: '2026-11-06T12:00:00Z' },
      ]),
      listPlayedRequestIds: vi.fn().mockResolvedValue(['older-request']),
      setStatus: vi.fn(),
    }
    const queueStore: DjMusicQueueStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { requestId: 'older-request', source: 'request', title: 'Água de beber', artist: 'Artista', videoId: null, submittedUrl: null, guestName: 'Ana' },
        { requestId: 'newer-request', source: 'request', title: 'Zebra hit', artist: 'Canal - Topic', videoId: 'abcdefghijk', submittedUrl: null, guestName: 'Bia' },
      ]),
      addYoutubeTrack: vi.fn(),
      reorder: vi.fn(),
      remove: vi.fn(),
    }
    render(<DjRequestsSection roomId="room-a" store={store} queueStore={queueStore} filter="approved" />)

    const firstTitle = await screen.findByRole('heading', { name: 'Zebra hit' })
    const approvedHeader = screen.getByRole('searchbox', { name: 'Buscar pedidos aprovados' }).closest('.room-requests-header--approved')
    expect(approvedHeader).not.toBeNull()
    const refreshButton = screen.getByRole('button', { name: 'Atualizar pedidos' })
    expect(approvedHeader?.querySelector('.room-requests-title-row')).toContainElement(refreshButton)
    expect(screen.getByRole('combobox', { name: /ordenar/i })).toHaveValue('newest')
    expect(firstTitle.closest('li')).toHaveTextContent('Na fila #2')
    expect(screen.getByText('Canal')).toBeInTheDocument()
    expect(screen.getByText('Tocada')).toBeInTheDocument()
    expect(screen.getByText('Na fila #1').closest('li')).toHaveTextContent('Tocada')
    expect(screen.getByRole('link', { name: 'Abrir vídeo de Água de beber' })).toHaveAttribute('href', 'https://youtu.be/abcdefghijl')

    fireEvent.change(screen.getByRole('combobox', { name: /ordenar/i }), { target: { value: 'oldest' } })
    expect((await screen.findAllByRole('heading')).slice(-2).map((heading) => heading.textContent)).toEqual(['Água de beber', 'Zebra hit'])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedidos aprovados' }), { target: { value: 'bia' } })
    expect(screen.getByRole('heading', { name: 'Zebra hit' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Água de beber' })).not.toBeInTheDocument()
  })
})
