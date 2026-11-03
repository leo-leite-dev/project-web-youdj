import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoomQrDataUrl } from './roomQr'

const { toDataURLMock } = vi.hoisted(() => ({
  toDataURLMock: vi.fn<(text: string, options?: unknown) => Promise<string>>(),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: toDataURLMock,
  },
}))

const link = 'https://project-web-youdj.pages.dev/sala/AB12CD34EF'

describe('createRoomQrDataUrl', () => {
  beforeEach(() => {
    toDataURLMock.mockReset()
  })

  it('generates a PNG data URL locally from the public link', async () => {
    toDataURLMock.mockResolvedValue('data:image/png;base64,qr')

    await expect(createRoomQrDataUrl(link)).resolves.toBe('data:image/png;base64,qr')
    expect(toDataURLMock).toHaveBeenCalledWith(
      link,
      expect.objectContaining({ margin: 1, width: 320 }),
    )
  })

  it('propagates generation failures to the caller', async () => {
    toDataURLMock.mockRejectedValue(new Error('canvas indisponível'))

    await expect(createRoomQrDataUrl(link)).rejects.toThrow('canvas indisponível')
  })
})
