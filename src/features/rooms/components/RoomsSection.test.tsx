import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRoom } from '../../../test/roomTestDoubles'
import type { Room, RoomStatus } from '../roomTypes'
import { createRoomQrDataUrl } from '../lib/roomQr'
import { RoomsSection } from './RoomsSection'

vi.mock('../lib/roomQr', () => ({
  createRoomQrDataUrl: vi.fn(),
}))

const link = `${window.location.origin}/sala/AB12CD34EF`

function renderSection(
  rooms = [makeRoom()],
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<Room> = async (roomId, status) =>
    makeRoom({ id: roomId, status }),
) {
  return render(
    <RoomsSection
      createRoom={vi.fn()}
      error={null}
      onRetry={vi.fn()}
      rooms={rooms}
      status="ready"
      updateRoomStatus={updateRoomStatus}
    />,
  )
}

describe('RoomsSection sharing actions', () => {
  beforeEach(() => {
    vi.mocked(createRoomQrDataUrl).mockReset()
    vi.mocked(createRoomQrDataUrl).mockResolvedValue('data:image/png;base64,qr')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('shows the public link of each room', () => {
    renderSection()

    const input = screen.getByLabelText('Link público da sala Festa Teste')
    expect(input).toHaveValue(link)
  })

  it('copies the public link to the clipboard', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Link copiado.')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link)
  })

  it('reports when the clipboard is unavailable', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'))
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível copiar automaticamente/i)
  })

  it('toggles the QR Code panel for the room', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /qr code/i }))

    const image = await screen.findByRole('img', { name: 'QR Code da sala Festa Teste' })
    expect(image).toHaveAttribute('src', 'data:image/png;base64,qr')
    expect(createRoomQrDataUrl).toHaveBeenCalledWith(link)
    expect(screen.getByRole('link', { name: 'Baixar PNG' })).toHaveAttribute(
      'download',
      'sala-AB12CD34EF.png',
    )
  })

  it('requests a status change for the selected room', async () => {
    const updateRoomStatus = vi.fn(async (roomId: string, status: RoomStatus) =>
      makeRoom({ id: roomId, status }),
    )
    const room = makeRoom()
    renderSection([room], updateRoomStatus)

    fireEvent.click(screen.getByRole('button', { name: 'Pausar sala' }))

    expect(await screen.findByRole('button', { name: 'Pausar sala' })).toBeEnabled()
    expect(updateRoomStatus).toHaveBeenCalledWith(room.id, 'paused')
  })

  it('reports a status update failure without claiming success', async () => {
    const updateRoomStatus = vi.fn().mockRejectedValue(new Error('offline'))
    renderSection([makeRoom()], updateRoomStatus)

    fireEvent.click(screen.getByRole('button', { name: 'Pausar sala' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível atualizar o status da sala. Tente novamente.',
    )
    expect(screen.getByRole('button', { name: 'Pausar sala' })).toBeEnabled()
  })
})
