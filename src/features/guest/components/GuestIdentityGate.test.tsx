import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makePublicRoom } from '../../../test/roomTestDoubles'
import { saveGuestIdentity, type GuestIdentity } from '../services/guestIdentity'
import type { GuestPresenceStore } from '../services/guestPresenceStore'
import { GuestIdentityGate } from './GuestIdentityGate'

const identity: GuestIdentity = {
  guestId: 'a1111111-1111-4111-8111-111111111111',
  nickname: 'Ana',
}

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('GuestIdentityGate presence', () => {
  it('sends a heartbeat immediately and keeps updating presence while the page is visible', async () => {
    saveGuestIdentity(identity)
    const store: GuestPresenceStore = { heartbeat: vi.fn().mockResolvedValue(undefined) }
    vi.useFakeTimers()
    render(<GuestIdentityGate room={makePublicRoom()} store={store}>
      {(currentIdentity, online) => <p>{online ? `${currentIdentity.nickname} entrou` : 'Conectando'}</p>}
    </GuestIdentityGate>)

    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(screen.getByText('Ana entrou')).toBeInTheDocument()
    expect(store.heartbeat).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(store.heartbeat).toHaveBeenCalledTimes(2)
  })

  it('leaves connecting after a failed heartbeat and goes online after retry succeeds', async () => {
    saveGuestIdentity(identity)
    const store: GuestPresenceStore = {
      heartbeat: vi.fn()
        .mockRejectedValueOnce(new Error('Serviço temporariamente indisponível'))
        .mockResolvedValueOnce(undefined),
    }
    render(<GuestIdentityGate room={makePublicRoom()} store={store}>
      {(currentIdentity, online, error, retryPresence) => (
        <>
          <p>{online ? `${currentIdentity.nickname} entrou` : 'Conectando à sala...'}</p>
          {error && <p role="alert">{error}</p>}
          <button onClick={retryPresence}>Tentar novamente</button>
        </>
      )}
    </GuestIdentityGate>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço temporariamente indisponível')
    expect(screen.getByText('Conectando à sala...')).toBeInTheDocument()

    await act(async () => { screen.getByRole('button', { name: 'Tentar novamente' }).click() })

    expect(await screen.findByText('Ana entrou')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(store.heartbeat).toHaveBeenCalledTimes(2)
  })
})
