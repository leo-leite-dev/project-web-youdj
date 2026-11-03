import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoomQrDataUrl } from '../lib/roomQr'
import { RoomQrPanel } from './RoomQrPanel'

vi.mock('../lib/roomQr', () => ({
  createRoomQrDataUrl: vi.fn(),
}))

const dataUrl = 'data:image/png;base64,qr'
const link = 'https://project-web-youdj.pages.dev/sala/AB12CD34EF'

describe('RoomQrPanel', () => {
  beforeEach(() => {
    vi.mocked(createRoomQrDataUrl).mockReset()
  })

  it('renders the generated QR Code with a download link', async () => {
    vi.mocked(createRoomQrDataUrl).mockResolvedValue(dataUrl)

    render(<RoomQrPanel code="AB12CD34EF" link={link} roomName="Festa Teste" />)

    expect(screen.getByRole('status')).toHaveTextContent('Gerando QR Code...')

    const image = await screen.findByRole('img', { name: 'QR Code da sala Festa Teste' })
    expect(image).toHaveAttribute('src', dataUrl)

    const download = screen.getByRole('link', { name: 'Baixar PNG' })
    expect(download).toHaveAttribute('download', 'sala-AB12CD34EF.png')
    expect(download).toHaveAttribute('href', dataUrl)
    expect(createRoomQrDataUrl).toHaveBeenCalledWith(link)
  })

  it('shows an alert when the QR Code cannot be generated', async () => {
    vi.mocked(createRoomQrDataUrl).mockRejectedValue(new Error('falhou'))

    render(<RoomQrPanel code="AB12CD34EF" link={link} roomName="Festa Teste" />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível gerar o QR Code. Tente novamente.')
  })
})
