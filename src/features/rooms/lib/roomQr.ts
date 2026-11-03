const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  width: 320,
}

/**
 * Gera localmente (sem serviços externos) o QR Code do link público da sala
 * como data URL PNG, pronta para exibição e download.
 */
export async function createRoomQrDataUrl(link: string): Promise<string> {
  const { default: QRCode } = await import('qrcode')
  return QRCode.toDataURL(link, QR_OPTIONS)
}
