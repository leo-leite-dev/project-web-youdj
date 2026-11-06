import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjMusicQueueStore } from '../services/djMusicQueueStore'
import { DjMusicQueueSection } from './DjMusicQueueSection'

describe('DjMusicQueueSection', () => {
  it('loads and reorders/removes items scoped to the room without playback controls', async () => {
    const listByRoom = vi.fn().mockResolvedValue([
      { requestId: 'a', title: 'Primeira', artist: 'Artista A', videoId: null, submittedUrl: null, guestName: 'Convidado A' },
      { requestId: 'b', title: 'Segunda', artist: 'Artista B', videoId: null, submittedUrl: null, guestName: 'Convidado B' },
    ])
    const store: DjMusicQueueStore = { listByRoom, reorder: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) }
    render(<DjMusicQueueSection roomId="room-a" store={store} />)

    const move = await screen.findByRole('button', { name: 'Mover Segunda para cima' })
    fireEvent.click(move)
    expect(store.reorder).toHaveBeenCalledWith('room-a', ['b', 'a'])
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remover' })[0]).toBeEnabled())
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[0])
    await waitFor(() => expect(store.remove).toHaveBeenCalledWith('room-a', 'b'))
    expect(listByRoom).toHaveBeenCalledWith('room-a')
    expect(screen.getByText(/Player não disponível/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reproduzir|play/i })).not.toBeInTheDocument()
  })
})
