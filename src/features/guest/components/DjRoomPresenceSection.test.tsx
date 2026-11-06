import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DjPresenceStore } from '../services/djPresenceStore'
import { DjRoomPresenceSection } from './DjRoomPresenceSection'

describe('DjRoomPresenceSection', () => {
  it('shows the empty state only after a successful zero-presence response', async () => {
    const store: DjPresenceStore = { listOnline: vi.fn().mockResolvedValue({ count: 0, guests: [] }) }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    expect(await screen.findByText('Ninguém conectado no momento.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an RPC error and retry action instead of an empty-presence claim', async () => {
    const store: DjPresenceStore = { listOnline: vi.fn().mockRejectedValue({ code: 'PGRST202' }) }
    render(<DjRoomPresenceSection roomId="room-a" store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('migrations locais')
    expect(screen.queryByText('Ninguém conectado no momento.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
