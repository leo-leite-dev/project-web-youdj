import { useEffect, useState } from 'react'
import { createRoomQrDataUrl } from '../lib/roomQr'

interface RoomQrPanelProps {
  code: string
  link: string
  roomName: string
}

/**
 * Exibe o QR Code gerado localmente para o link público da sala e permite
 * baixá-lo em PNG. A geração é isolada em `roomQr` para testabilidade.
 */
export function RoomQrPanel({ code, link, roomName }: RoomQrPanelProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    createRoomQrDataUrl(link)
      .then((url) => {
        if (active) {
          setDataUrl(url)
          setError(null)
        }
      })
      .catch(() => {
        if (active) {
          setDataUrl(null)
          setError('Não foi possível gerar o QR Code. Tente novamente.')
        }
      })

    return () => {
      active = false
    }
  }, [link])

  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-night-950/60 p-4">
      {error ? (
        <p role="alert" className="text-xs leading-5 text-red-300">
          {error}
        </p>
      ) : null}

      {dataUrl ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <img
            src={dataUrl}
            alt={`QR Code da sala ${roomName}`}
            width={160}
            height={160}
            className="size-40 shrink-0 rounded-lg bg-white p-2"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold text-zinc-200">QR Code da sala</p>
            <p className="mt-1 break-all font-mono text-[11px] leading-5 text-zinc-500">
              {link}
            </p>
            <a
              href={dataUrl}
              download={`sala-${code}.png`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/10 sm:w-auto"
            >
              Baixar PNG
            </a>
          </div>
        </div>
      ) : !error ? (
        <p role="status" className="text-xs leading-5 text-zinc-500">
          Gerando QR Code...
        </p>
      ) : null}
    </div>
  )
}
